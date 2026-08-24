import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../src/index.js';

function request(path, init) {
  return worker.fetch(new Request(`https://example.test${path}`, init));
}

async function read(response) {
  return { status: response.status, headers: response.headers, body: await response.json() };
}

test('health endpoint', async () => {
  const { status, body } = await read(await request('/api/health'));
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.version, '2.1.0');
});

test('unknown API is JSON 404', async () => {
  const { status, body } = await read(await request('/api/nope'));
  assert.equal(status, 404);
  assert.equal(body.ok, false);
});

test('known API wrong method is JSON 405', async () => {
  const response = await request('/api/calc');
  const body = await response.json();
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
  assert.deepEqual(body.allowed, ['POST']);
});

test('invalid currency is rejected instead of silently defaulted', async () => {
  const { status, body } = await read(await request('/api/rate?from=XXX&to=CNY'));
  assert.equal(status, 400);
  assert.match(body.error, /不支持币种/);
});

test('invalid history days is rejected', async () => {
  const { status, body } = await read(await request('/api/rate-history?days=7.5'));
  assert.equal(status, 400);
  assert.match(body.error, /整数/);
});

test('same-currency history returns identity points without upstream failure', async () => {
  const { status, body } = await read(await request('/api/rate-history?from=USD&to=USD&days=7'));
  assert.equal(status, 200);
  assert.equal(body.points.length, 7);
  assert.ok(body.points.every((point) => point.rate === 1));
});

test('calc validates content type, JSON and real dates', async () => {
  let result = await read(await request('/api/calc', { method: 'POST', body: '{}' }));
  assert.equal(result.status, 400);
  assert.match(result.body.error, /Content-Type/);

  result = await read(await request('/api/calc', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
  }));
  assert.equal(result.status, 400);
  assert.match(result.body.error, /JSON/);

  result = await read(await request('/api/calc', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ price: 100, startDate: '2026-02-31', endDate: '2026-03-02' }),
  }));
  assert.equal(result.status, 400);
  assert.match(result.body.error, /真实有效/);
});

test('same-currency calc avoids upstream fetch and returns deterministic result', async () => {
  const { status, body } = await read(await request('/api/calc', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      price: 100,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      cycle: 'monthly',
      asOf: '2026-08-24',
      from: 'USD',
      to: 'USD',
    }),
  }));
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.leftDays, 8);
  assert.equal(body.value, 100 * 8 / 31);
  assert.equal(body.converted, 100 * 8 / 31);
  assert.equal(body.rate, 1);
  assert.equal(body.rateSource, 'identity');
  assert.equal(body.asOf, '2026-08-24');
});

test('calc rejects an invalid asOf calendar date', async () => {
  const { status, body } = await read(await request('/api/calc', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      price: 100,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      asOf: '2026-02-31',
    }),
  }));
  assert.equal(status, 400);
  assert.match(body.error, /asOf/);
});

test('page routes and security headers', async () => {
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const page = await home.text();
  assert.match(page, /服务器剩余价值/);
  assert.match(page, /\[ 输入 \]/);
  assert.match(page, /\[ 输出 \]/);
  assert.match(page, /总服务天数/);
  assert.match(page, /开始计算/);
  assert.match(page, /USD（美元）/);
  assert.doesNotMatch(page, /CHECKING|CALCULATE|days\.total|value\.source|INPUT|OUTPUT/);

  const inlineScript = page.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript, '页面必须包含内联脚本');
  assert.doesNotThrow(() => new vm.Script(inlineScript), '最终 HTML 中的浏览器脚本必须语法有效');

  const missing = await request('/missing');
  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), 'Not Found');
});
