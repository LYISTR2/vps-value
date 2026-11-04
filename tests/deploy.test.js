import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../deploy.sh', import.meta.url), 'utf8');

test('deploy script supports install lifecycle commands', () => {
  assert.match(script, /install\|update\)/);
  assert.match(script, /status\)/);
  assert.match(script, /logs\)/);
  assert.match(script, /uninstall\)/);
});

test('deploy script supports both Compose v2 and standalone docker-compose', () => {
  assert.match(script, /docker compose version/);
  assert.match(script, /command -v docker-compose/);
});

test('update and status preserve an existing custom port', () => {
  assert.match(script, /load_existing_port\(\)/);
  assert.match(script, /saved=.*awk/);
  const uses = script.match(/load_existing_port/g) || [];
  assert.ok(uses.length >= 3);
});

test('deployment waits for the health endpoint', () => {
  assert.match(script, /\/api\/health/);
  assert.match(script, /服务未通过健康检查/);
});

test('compose does not hard-code a global container name', () => {
  const compose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(compose, /container_name:/);
});

test('uninstall does not delete an image potentially shared by another instance', () => {
  assert.doesNotMatch(script, /compose down --rmi/);
  assert.match(script, /共享镜像未删除/);
});

// Execute lifecycle commands against disposable fixtures and fake Docker/curl.
// No Docker daemon, package manager or external download is involved.
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'vps-value-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, 'bin'), install = join(dir, 'app'), source = join(dir, 'vps-value-main');
  mkdirSync(bin); mkdirSync(source);
  writeFileSync(join(source, 'package.json'), '{"name":"vps-residual-value-worker"}');
  writeFileSync(join(source, 'server.js'), '// new version');
  writeFileSync(join(source, 'docker-compose.yml'), 'services: {}');
  const archive = join(dir, 'source.tar.gz');
  assert.equal(spawnSync('tar', ['-czf', archive, '-C', dir, 'vps-value-main']).status, 0);
  writeFileSync(join(bin, 'docker'), '#!/bin/bash\nprintf "%s\\n" "$*" >> "$FAKE_LOG"\nif [[ "$*" == *"down"* && "${FAIL_DOWN:-}" == 1 ]]; then exit 1; fi\n', { mode: 0o755 });
  writeFileSync(join(bin, 'curl'), '#!/bin/bash\nwhile (( $# )); do if [[ "$1" == "-o" ]]; then cp "$FAKE_ARCHIVE" "$2"; exit; fi; shift; done\n', { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, VPS_VALUE_DIR: install, FAKE_ARCHIVE: archive, FAKE_LOG: join(dir, 'docker.log') };
  delete env.PORT;
  return { dir, install, env, run: (action, extra = {}) => spawnSync('bash', [resolve('deploy.sh'), action], { env: { ...env, ...extra }, encoding: 'utf8', timeout: 5000 }) };
}
const rootOnly = { skip: process.getuid?.() !== 0 ? 'deployment script requires root' : false };

test('deployment rejects non-project directories, system paths and symlinks before Docker', rootOnly, (t) => {
  const f = fixture(t);
  mkdirSync(f.install); writeFileSync(join(f.install, 'precious.txt'), 'keep');
  assert.notEqual(f.run('install').status, 0);
  assert.equal(readFileSync(join(f.install, 'precious.txt'), 'utf8'), 'keep');
  assert.notEqual(f.run('uninstall', { VPS_VALUE_DIR: '/' }).status, 0);
  const link = join(f.dir, 'link'); symlinkSync(f.install, link);
  assert.notEqual(f.run('uninstall', { VPS_VALUE_DIR: link }).status, 0);
  assert.equal(existsSync(f.env.FAKE_LOG), false);
});

test('install/update preserve extra files, env settings and saved port; uninstall retains files', rootOnly, (t) => {
  const f = fixture(t);
  let run = f.run('install', { PORT: '09000' });
  assert.equal(run.status, 0, run.stderr + run.stdout);
  writeFileSync(join(f.install, 'precious.txt'), 'keep');
  writeFileSync(join(f.install, '.env'), 'PORT=9000\nCUSTOM=keep\n');
  run = f.run('update');
  assert.equal(run.status, 0, run.stderr + run.stdout);
  assert.equal(readFileSync(join(f.install, '.env'), 'utf8'), 'CUSTOM=keep\nPORT=9000\n');
  assert.equal(readFileSync(join(f.install, 'precious.txt'), 'utf8'), 'keep');
  assert.equal(f.run('status').status, 0);
  assert.equal(f.run('uninstall').status, 0);
  assert.equal(readFileSync(join(f.install, 'precious.txt'), 'utf8'), 'keep');
  assert.equal(existsSync(join(f.install, 'server.js')), true);
  assert.match(readFileSync(f.env.FAKE_LOG, 'utf8'), /compose down --remove-orphans/);
});

test('invalid explicit or saved ports fail before starting containers', rootOnly, (t) => {
  const f = fixture(t);
  for (const port of ['0', '65536', 'abc', '-1', '1:80']) assert.notEqual(f.run('install', { PORT: port }).status, 0);
  assert.equal(existsSync(f.env.FAKE_LOG), false);
  assert.equal(f.run('install').status, 0);
  writeFileSync(join(f.install, '.env'), 'PORT=bad\n');
  assert.notEqual(f.run('update').status, 0);
});

test('uninstall reports failure when Docker cannot remove containers', rootOnly, (t) => {
  const f = fixture(t);
  assert.equal(f.run('install').status, 0);
  const run = f.run('uninstall', { FAIL_DOWN: '1' });
  assert.notEqual(run.status, 0);
  assert.doesNotMatch(run.stdout, /已卸载/);
});
