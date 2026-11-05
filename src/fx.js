import { isValidDateString } from './calc.js';

const RATE_TTL_MS = 10 * 60 * 1000;
const HISTORY_TTL_MS = 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_HISTORY_ENTRIES = 128;
const DAY_MS = 86_400_000;

export const SUPPORTED_CURRENCIES = new Set([
  'USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'CAD', 'GBP',
]);

export function validCurrency(code) {
  if (typeof code !== 'string') return null;
  const value = code.toUpperCase();
  return SUPPORTED_CURRENCIES.has(value) ? value : null;
}

function currency(code) {
  const value = validCurrency(code);
  if (!value) throw new TypeError('不支持的币种');
  return value;
}

function positiveRate(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** A client per runtime; injectable dependencies keep network tests deterministic. */
export function createFxClient({ fetchImpl = (...args) => fetch(...args), now = Date.now, timeoutMs = UPSTREAM_TIMEOUT_MS } = {}) {
  const rateCache = new Map();
  const historyCache = new Map();
  const pending = new Map();

  async function cached(cache, key, ttl, limit, load) {
    const entry = cache.get(key);
    if (entry && now() - entry.ts < ttl) return entry.value;
    if (pending.has(key)) return pending.get(key);
    const task = (async () => {
      try {
        const value = await load();
        cache.delete(key);
        cache.set(key, { ts: now(), value });
        while (cache.size > limit) cache.delete(cache.keys().next().value);
        return value;
      } finally {
        pending.delete(key);
      }
    })();
    pending.set(key, task);
    return task;
  }

  async function fetchJson(url, label, cacheTtl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: { accept: 'application/json' },
        signal: controller.signal,
        cf: { cacheTtl, cacheEverything: true },
      });
      if (!response.ok) throw new Error('upstream status');
      return await response.json();
    } catch {
      // fetch itself throws TypeError on network errors; this is not a client 400.
      throw new Error(controller.signal.aborted ? `${label}请求超时` : `${label}暂时不可用`);
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchRates(base = 'USD') {
    base = currency(base);
    return cached(rateCache, `rate:${base}`, RATE_TTL_MS, SUPPORTED_CURRENCIES.size, async () => {
      const data = await fetchJson(`https://open.er-api.com/v6/latest/${base}`, '汇率接口', 300);
      if (data?.result !== 'success' || data.base_code !== base || !data.rates || Array.isArray(data.rates)) {
        throw new Error('汇率数据异常');
      }
      const rates = {};
      for (const code of SUPPORTED_CURRENCIES) {
        if (data.rates[code] === undefined) continue;
        if (!positiveRate(data.rates[code])) throw new Error('汇率数据异常');
        rates[code] = data.rates[code];
      }
      if (rates[base] !== 1) throw new Error('汇率数据异常');
      return Object.freeze(rates);
    });
  }

  async function getRate(from, to) {
    from = currency(from);
    to = currency(to);
    if (from === to) return 1;
    const rates = await fetchRates(from);
    if (!positiveRate(rates[to])) throw new Error('汇率数据缺少目标币种');
    return rates[to];
  }

  async function getRateHistory(from, to, days = 7) {
    from = currency(from);
    to = currency(to);
    if (!Number.isInteger(days) || days < 3 || days > 30) throw new TypeError('days 必须是 3 到 30 的整数');
    const endStr = new Date(now()).toISOString().slice(0, 10);
    const end = new Date(`${endStr}T00:00:00Z`).getTime();
    const start = end - (days - 1) * DAY_MS;
    const fmt = (time) => new Date(time).toISOString().slice(0, 10);
    const startStr = fmt(start);
    // Include the UTC date so a cache entry cannot span a change of date range.
    const key = `history:${from}:${to}:${days}:${endStr}`;
    return cached(historyCache, key, HISTORY_TTL_MS, MAX_HISTORY_ENTRIES, async () => {
      if (from === to) {
        return Object.freeze(Array.from({ length: days }, (_, index) => Object.freeze({ date: fmt(start + index * DAY_MS), rate: 1 })));
      }
      const url = `https://api.frankfurter.app/${startStr}..${endStr}?from=${from}&to=${to}`;
      const data = await fetchJson(url, '历史汇率接口', 3600);
      if (data?.base !== from || !data.rates || typeof data.rates !== 'object' || Array.isArray(data.rates)) {
        throw new Error('历史汇率数据异常');
      }
      const points = Object.keys(data.rates)
        .filter((date) => isValidDateString(date) && date >= startStr && date <= endStr)
        .sort()
        .map((date) => ({ date, rate: data.rates[date]?.[to] }));
      if (!points.length || points.some((point) => !positiveRate(point.rate))) throw new Error('历史汇率数据异常');
      return Object.freeze(points.map(Object.freeze));
    });
  }

  return { fetchRates, getRate, getRateHistory };
}

export const { fetchRates, getRate, getRateHistory } = createFxClient();
