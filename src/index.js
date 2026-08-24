import { html } from './html.js';
import { fetchRates, getRateHistory, validCurrency } from './fx.js';
import { calcResidualValue, isValidDateString } from './calc.js';

const API_ROUTES = new Map([
  ['/api/rate', new Set(['GET'])],
  ['/api/rate-history', new Set(['GET'])],
  ['/api/calc', new Set(['POST'])],
  ['/api/health', new Set(['GET'])],
]);

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

function badRequest(message, details) {
  return json({ ok: false, error: message, ...(details ? { details } : {}) }, 400);
}

function readCurrency(raw, fallback, field) {
  if (raw == null || raw === '') return fallback;
  const value = validCurrency(raw);
  if (!value) throw new TypeError(`${field} 不支持币种: ${String(raw).toUpperCase()}`);
  return value;
}

function methodNotAllowed(pathname, allowed) {
  return json(
    { ok: false, error: `Method Not Allowed: ${pathname}`, allowed: [...allowed] },
    405,
    { allow: [...allowed].join(', ') },
  );
}

async function parseJsonBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new TypeError('Content-Type 必须是 application/json');
  }
  try {
    return await request.json();
  } catch {
    throw new TypeError('请求 JSON 格式错误');
  }
}

async function handleApi(request, url) {
  const allowed = API_ROUTES.get(url.pathname);
  if (!allowed) return json({ ok: false, error: 'API Not Found' }, 404);
  if (!allowed.has(request.method)) return methodNotAllowed(url.pathname, allowed);

  if (url.pathname === '/api/health') {
    return json({ ok: true, service: 'vps-value', version: '2.1.0' });
  }

  if (url.pathname === '/api/rate') {
    try {
      const from = readCurrency(url.searchParams.get('from'), 'USD', 'from');
      const to = readCurrency(url.searchParams.get('to'), 'CNY', 'to');
      if (from === to) return json({ ok: true, from, to, rate: 1, source: 'identity' });
      const rates = await fetchRates(from);
      const rate = rates[to];
      if (typeof rate !== 'number') return badRequest(`不支持币种: ${to}`);
      return json({ ok: true, from, to, rate, source: 'open.er-api.com' });
    } catch (error) {
      if (error instanceof TypeError) return badRequest(error.message);
      return json({ ok: false, error: error.message || '汇率获取失败' }, 502);
    }
  }

  if (url.pathname === '/api/rate-history') {
    try {
      const from = readCurrency(url.searchParams.get('from'), 'USD', 'from');
      const to = readCurrency(url.searchParams.get('to'), 'CNY', 'to');
      const rawDays = url.searchParams.get('days');
      const parsedDays = rawDays == null || rawDays === '' ? 7 : Number(rawDays);
      if (!Number.isInteger(parsedDays) || parsedDays < 3 || parsedDays > 30) {
        return badRequest('days 必须是 3 到 30 的整数');
      }
      const points = await getRateHistory(from, to, parsedDays);
      return json({ ok: true, from, to, days: parsedDays, points, source: 'frankfurter.app' });
    } catch (error) {
      if (error instanceof TypeError) return badRequest(error.message);
      return json({ ok: false, error: error.message || '历史汇率获取失败' }, 502);
    }
  }

  try {
    const body = await parseJsonBody(request);
    const { price, startDate, endDate } = body;
    const cycle = body.cycle || 'custom';
    const asOf = body.asOf == null || body.asOf === '' ? undefined : body.asOf;
    const from = readCurrency(body.from, 'USD', 'from');
    const to = readCurrency(body.to, 'USD', 'to');

    if (!(typeof price === 'number' && Number.isFinite(price) && price >= 0)) {
      return badRequest('price 必须是非负有限数字');
    }
    if (!isValidDateString(startDate)) return badRequest('startDate 必须是真实有效的 YYYY-MM-DD 日期');
    if (!isValidDateString(endDate)) return badRequest('endDate 必须是真实有效的 YYYY-MM-DD 日期');
    if (asOf !== undefined && !isValidDateString(asOf)) return badRequest('asOf 必须是真实有效的 YYYY-MM-DD 日期');

    const result = calcResidualValue({ price, startDate, endDate, cycle, today: asOf });
    let rate = 1;
    let rateSource = 'identity';
    if (from !== to) {
      const rates = await fetchRates(from);
      rate = rates[to];
      if (typeof rate !== 'number') return badRequest(`不支持币种: ${to}`);
      rateSource = 'open.er-api.com';
    }

    return json({
      ok: true,
      ...result,
      from,
      to,
      rate,
      rateSource,
      asOf: asOf || null,
      converted: result.value * rate,
    });
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) return badRequest(error.message);
    return json({ ok: false, error: error.message || '计算或汇率获取失败' }, 502);
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/favicon.ico') return new Response(null, { status: 204 });
    if (url.pathname.startsWith('/api/')) return handleApi(request, url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return methodNotAllowed(url.pathname, new Set(['GET', 'HEAD']));
    }
    if (url.pathname !== '/') return new Response('Not Found', { status: 404 });

    return new Response(request.method === 'HEAD' ? null : html(), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
        'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        'referrer-policy': 'no-referrer',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
      },
    });
  },
};
