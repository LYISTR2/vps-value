import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFxClient } from '../src/fx.js';

const table = (base) => ({ result: 'success', base_code: base, rates: { USD: 1.1, CNY: 7, [base]: 1 } });

test('rates cache each base and coalesce simultaneous requests', async () => {
  let calls = 0, time = 0;
  const client = createFxClient({ now: () => time, fetchImpl: async (url) => { calls++; return Response.json(table(url.split('/').at(-1))); } });
  const rates = await Promise.all(Array.from({ length: 10 }, () => client.getRate('USD', 'CNY')));
  assert.deepEqual(rates, Array(10).fill(7));
  assert.equal(calls, 1);
  await client.getRate('EUR', 'CNY');
  await client.getRate('USD', 'CNY');
  assert.equal(calls, 2);
  time = 600_001;
  await client.getRate('USD', 'CNY');
  assert.equal(calls, 3);
});

test('failed requests can retry; network errors never become validation TypeErrors', async () => {
  let calls = 0;
  const client = createFxClient({ fetchImpl: async () => { if (++calls === 1) throw new TypeError('fetch failed'); return Response.json(table('USD')); } });
  await assert.rejects(client.getRate('USD', 'CNY'), (error) => !(error instanceof TypeError) && /暂时不可用/.test(error.message));
  assert.equal(await client.getRate('USD', 'CNY'), 7);
});

test('invalid rates, wrong bases, missing currencies and invalid JSON are upstream errors', async () => {
  for (const value of [0, -1, '7', null, Infinity, NaN]) {
    const client = createFxClient({ fetchImpl: async () => ({ ok: true, json: async () => ({ ...table('USD'), rates: { USD: 1, CNY: value } }) }) });
    await assert.rejects(client.getRate('USD', 'CNY'), /数据异常/);
  }
  for (const payload of [table('EUR'), { ...table('USD'), result: 'error' }, { ...table('USD'), rates: { USD: 1 } }]) {
    const client = createFxClient({ fetchImpl: async () => Response.json(payload) });
    await assert.rejects(client.getRate('USD', 'CNY'), /数据/);
  }
  const client = createFxClient({ fetchImpl: async () => new Response('{') });
  await assert.rejects(client.getRate('USD', 'CNY'), /不可用/);
});

test('upstream timeout covers fetching and reading the body', async () => {
  for (const stallBody of [false, true]) {
    const client = createFxClient({ timeoutMs: 10, fetchImpl: (_url, { signal }) => {
      const stalled = () => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
      return stallBody ? { ok: true, json: stalled } : stalled();
    } });
    await assert.rejects(client.getRate('USD', 'CNY'), /超时/);
  }
});

test('history filters out-of-range dates and caches by pair and UTC day', async () => {
  let time = Date.parse('2026-11-04T23:59:59Z'), calls = 0;
  const client = createFxClient({ now: () => time, fetchImpl: async () => {
    calls++;
    return Response.json({ base: 'USD', rates: { '2026-11-02': { CNY: 7 }, '2026-11-04': { CNY: 7.1 }, '2026-11-01': { CNY: 6 }, '2026-11-06': { CNY: 8 }, '2026-11-00': { CNY: 9 } } });
  } });
  assert.deepEqual(await client.getRateHistory('USD', 'CNY', 3), [{ date: '2026-11-02', rate: 7 }, { date: '2026-11-04', rate: 7.1 }]);
  await client.getRateHistory('USD', 'CNY', 3);
  assert.equal(calls, 1);
  time += 2000;
  assert.deepEqual(await client.getRateHistory('USD', 'CNY', 3), [{ date: '2026-11-04', rate: 7.1 }]);
  assert.equal(calls, 2);
});

test('empty and invalid history is an error, identity needs no network', async () => {
  const now = () => Date.parse('2026-11-04T12:00:00Z');
  for (const rates of [{}, { '2026-11-04': { CNY: 0 } }]) {
    const client = createFxClient({ now, fetchImpl: async () => Response.json({ base: 'USD', rates }) });
    await assert.rejects(client.getRateHistory('USD', 'CNY'), /数据异常/);
  }
  const client = createFxClient({ now, fetchImpl: () => { throw new Error('must not fetch'); } });
  assert.equal((await client.getRateHistory('USD', 'USD', 3)).length, 3);
  await assert.rejects(client.getRateHistory('USD', 'USD', 2), /days/);
  await assert.rejects(client.getRate('XXX', 'XXX'), /币种/);
});
