import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { html } from '../src/html.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function result(body, value = body.price) {
  return { ok: true, totalDays: 31, leftDays: 15, ratio: .5, value, converted: value * (body.to === 'CNY' ? 7 : 1), from: body.from, to: body.to, rate: body.to === 'CNY' ? 7 : 1, rateSource: 'identity', cycle: body.cycle, asOf: body.asOf };
}
async function page() {
  const elements = new Map();
  for (const id of html().matchAll(/id="([^"]+)"/g)) {
    elements.set(id[1], { value: '', textContent: '', innerHTML: '', disabled: false, handlers: {}, addEventListener(event, handler) { this.handlers[event] = handler; }, setAttribute() {} });
  }
  const element = (id) => elements.get(id);
  element('price').value = '0'; element('from').value = 'USD'; element('to').value = 'USD'; element('cycle').value = 'monthly';
  const state = { fetch: async (path, options) => {
    if (path === '/api/calc') return Response.json(result(JSON.parse(options.body)));
    if (path === '/api/health') return Response.json({ ok: true });
    return Response.json({ ok: true, points: [] });
  } };
  const context = vm.createContext({ document: { getElementById: element }, fetch: (...args) => state.fetch(...args), AbortController, setTimeout, clearTimeout });
  vm.runInContext(html().match(/<script>([\s\S]*?)<\/script>/)[1], context);
  await tick(); await tick();
  return { context, element, state };
}

test('older calculations cannot overwrite the newest result or re-enable its button', async () => {
  const { context, element, state } = await page();
  const first = deferred(), second = deferred();
  let count = 0;
  state.fetch = async (path, options) => {
    assert.equal(path, '/api/calc');
    const body = JSON.parse(options.body);
    await (++count === 1 ? first.promise : second.promise);
    return Response.json(result(body));
  };
  element('from').value = 'CNY'; element('to').value = 'CNY';
  element('price').value = '10'; const old = context.calculate();
  element('price').value = '20'; const newest = context.calculate();
  first.resolve(); await old;
  assert.equal(element('run').disabled, true);
  assert.equal(element('sourceValue').textContent, '--');
  second.resolve(); await newest;
  assert.match(element('sourceValue').textContent, /20\.00 CNY/);
  assert.equal(element('run').disabled, false);
});

test('late old responses and edits cannot restore stale output', async () => {
  const { context, element, state } = await page();
  const delayed = deferred(); let calls = 0;
  state.fetch = async (_path, options) => {
    const body = JSON.parse(options.body);
    if (++calls === 1) await delayed.promise;
    return Response.json(result(body));
  };
  element('from').value = 'CNY'; element('to').value = 'CNY';
  element('price').value = '10'; const old = context.calculate();
  element('price').value = '20'; await context.calculate();
  delayed.resolve(); await old;
  assert.match(element('sourceValue').textContent, /20\.00 CNY/);
  element('form').handlers.input();
  assert.equal(element('sourceValue').textContent, '--');
  assert.match(element('status').textContent, /重新计算/);
});

test('optional CNY failure retains the successful main calculation', async () => {
  const { context, element, state } = await page();
  state.fetch = async (path, options) => {
    if (path === '/api/calc') return Response.json(result(JSON.parse(options.body)));
    return Response.json({ ok: false, error: 'upstream unavailable' }, { status: 502 });
  };
  element('price').value = '100'; await context.calculate();
  assert.match(element('sourceValue').textContent, /100\.00 USD/);
  assert.match(element('targetValue').textContent, /100\.00 USD/);
  assert.equal(element('cnyValue').textContent, '暂不可用');
  assert.match(element('status').textContent, /计算完成/);
});

test('CNY result reuses the calculation rate and notes remain plain text', async () => {
  const { context, element, state } = await page(); let calls = 0;
  state.fetch = async (path, options) => { assert.equal(path, '/api/calc'); calls++; return Response.json(result(JSON.parse(options.body))); };
  element('price').value = '100'; element('to').value = 'CNY'; element('note').value = '<img src=x onerror=alert(1)>';
  await context.calculate();
  assert.equal(calls, 1);
  assert.equal(element('cnyValue').textContent, element('targetValue').textContent);
  assert.match(element('log').textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(element('log').innerHTML, '');
});

test('failed main calculation clears previous output and flat chart is centered', async () => {
  const { context, element, state } = await page();
  state.fetch = async () => Response.json({ ok: false, error: 'invalid input' }, { status: 400 });
  await context.calculate();
  assert.equal(element('sourceValue').textContent, '--');
  assert.equal(element('status').textContent, 'invalid input');
  context.draw([{ date: '2026-11-03', rate: 1 }, { date: '2026-11-04', rate: 1 }]);
  assert.match(element('chart').innerHTML, /cy="59\.0"/);
});
