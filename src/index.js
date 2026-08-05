/**
 * Cloudflare Worker 入口
 * 路由: /api/rate, /api/rate-history, 其余返回页面
 */
import { html } from './html.js';
import { fetchRates, getRateHistory, validCurrency } from './fx.js';
import { calcResidualValue } from './calc.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function badRequest(msg) {
  return json({ ok: false, error: msg }, 400);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // GET /api/rate?from=X&to=Y
    if (url.pathname === '/api/rate' && request.method === 'GET') {
      const from = validCurrency(url.searchParams.get('from')) || 'USD';
      const to = validCurrency(url.searchParams.get('to')) || 'CNY';
      try {
        const rates = await fetchRates(from);
        const rate = rates[to];
        if (typeof rate !== 'number') return badRequest(`不支持币种: ${to}`);
        return json({ ok: true, from, to, rate });
      } catch (e) {
        return json({ ok: false, error: e.message || '汇率获取失败' }, 500);
      }
    }

    // GET /api/rate-history?from=X&to=Y&days=N
    if (url.pathname === '/api/rate-history' && request.method === 'GET') {
      const from = validCurrency(url.searchParams.get('from')) || 'USD';
      const to = validCurrency(url.searchParams.get('to')) || 'CNY';
      const days = Math.max(3, Math.min(30, Number(url.searchParams.get('days') || 7)));
      try {
        const points = await getRateHistory(from, to, days);
        return json({ ok: true, from, to, points });
      } catch (e) {
        return json({ ok: false, error: e.message || '历史汇率获取失败' }, 500);
      }
    }

    // POST /api/calc — 服务端计算（供 API 调用）
    if (url.pathname === '/api/calc' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { price, startDate, endDate, cycle } = body;
        const c = validCurrency(body.from) || 'USD';
        const t = validCurrency(body.to) || 'USD';

        if (!(typeof price === 'number' && price >= 0)) return badRequest('price 必须是非负数字');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || ''))) return badRequest('startDate 格式错误');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(endDate || ''))) return badRequest('endDate 格式错误');

        const result = calcResidualValue({ price, startDate, endDate, cycle });
        let rate = 1;
        if (c !== t) {
          try {
            const rates = await fetchRates(c);
            rate = rates[t] ?? 1;
          } catch { /* 汇率失败时按 1:1 */ }
        }
        return json({ ok: true, ...result, from: c, to: t, rate, converted: result.value * rate });
      } catch (e) {
        return json({ ok: false, error: e.message || '计算失败' }, 400);
      }
    }

    // 其余返回页面
    return new Response(html(), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
};
