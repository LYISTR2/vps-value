/**
 * 汇率服务 — 带缓存 & 降级策略
 */

const RATE_TTL_MS = 10 * 60 * 1000;
const HISTORY_TTL_MS = 60 * 60 * 1000;

// 支持的币种白名单
export const SUPPORTED_CURRENCIES = new Set([
  'USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'CAD', 'GBP',
]);

// 内存缓存（每次请求全局单例）
let rateCache = { ts: 0, base: null, rates: null };
let historyCache = { key: '', ts: 0, points: null };

/**
 * 获取实时汇率表（以 base 为基准）
 */
export async function fetchRates(base = 'USD') {
  const now = Date.now();
  if (rateCache.rates && rateCache.base === base && now - rateCache.ts < RATE_TTL_MS) {
    return rateCache.rates;
  }

  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`汇率接口失败: ${res.status}`);
  const data = await res.json();
  if (!data?.rates) throw new Error('汇率数据异常');

  rateCache = { ts: now, base, rates: data.rates };
  return data.rates;
}

/**
 * 获取单对汇率 from→to
 */
export async function getRate(from, to) {
  if (from === to) return 1;
  const rates = await fetchRates(from);
  const rate = rates[to];
  if (typeof rate !== 'number') throw new Error(`不支持币种: ${to}`);
  return rate;
}

/**
 * 获取历史汇率（frankfurter.app），返回 [{date, rate}]
 */
export async function getRateHistory(from, to, days = 7) {
  const clamped = Math.max(3, Math.min(30, days));
  const key = `${from}:${to}:${clamped}`;
  const now = Date.now();
  if (historyCache.key === key && historyCache.points && now - historyCache.ts < HISTORY_TTL_MS) {
    return historyCache.points;
  }

  const todayStr = todayUtc();
  const end = new Date(`${todayStr}T00:00:00Z`);
  const start = new Date(end.getTime() - (clamped - 1) * 86_400_000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  if (from === to) {
    const points = Array.from({ length: clamped }, (_, index) => ({
      date: fmt(new Date(start.getTime() + index * 86_400_000)),
      rate: 1,
    }));
    historyCache = { key, ts: now, points };
    return points;
  }
  const url =
    `https://api.frankfurter.app/${fmt(start)}..${fmt(end)}` +
    `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`历史汇率接口失败: ${res.status}`);
  const data = await res.json();
  const rates = data?.rates || {};

  const points = Object.keys(rates)
    .filter((date) => date <= todayStr)
    .sort()
    .map((date) => ({ date, rate: rates[date]?.[to] }))
    .filter((x) => typeof x.rate === 'number')
    .slice(-clamped);

  historyCache = { key, ts: now, points };
  return points;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 校验币种，非法返回 null
 */
export function validCurrency(code) {
  const c = String(code || '').toUpperCase();
  return SUPPORTED_CURRENCIES.has(c) ? c : null;
}
