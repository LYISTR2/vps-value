import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createServer } from '../server.js';

async function start(t) {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return server.address().port;
}
function send(port, { headers = {}, chunks = [], method = 'POST', path = '/api/calc', end = true } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res) => {
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(data).toString() }));
    });
    req.on('error', reject);
    for (const chunk of chunks) req.write(chunk);
    if (end) req.end(); else req.flushHeaders();
  });
}

test('HTTP adapter serves JSON and HEAD without using the untrusted Host header', async (t) => {
  const port = await start(t);
  assert.equal((await send(port, { method: 'HEAD', path: '/', headers: { host: 'malformed:port' } })).body, '');
  const response = await send(port, { headers: { 'content-type': 'application/json' }, chunks: [JSON.stringify({ price: 10, startDate: '2026-08-01', endDate: '2026-08-01', asOf: '2026-08-01' })] });
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(response.body).value, 10);
});

test('HTTP adapter rejects oversized declared bodies before upload', { timeout: 3000 }, async (t) => {
  const response = await send(await start(t), { headers: { 'content-length': 20000 }, end: false });
  assert.equal(response.status, 413);
  assert.equal(response.headers.connection, 'close');
  assert.equal(JSON.parse(response.body).ok, false);
});

test('HTTP adapter bounds chunked bodies and remains healthy', async (t) => {
  const port = await start(t);
  const response = await send(port, { chunks: [Buffer.alloc(10000), Buffer.alloc(10000)] });
  assert.equal(response.status, 413);
  assert.equal(JSON.parse(response.body).ok, false);
  assert.equal((await send(port, { method: 'GET', path: '/api/health' })).status, 200);
});
