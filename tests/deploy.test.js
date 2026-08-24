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