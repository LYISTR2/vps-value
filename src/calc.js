/**
 * 日期与剩余价值计算 — 纯函数，无副作用。
 * 所有日期均使用严格 YYYY-MM-DD 格式和 UTC 午夜，避免时区/DST 偏差。
 */

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateStrict(value) {
  const text = String(value || '');
  const match = DATE_RE.exec(text);
  if (!match) throw new TypeError(`日期格式错误: ${text || '(空)'}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) throw new RangeError(`无效月份: ${text}`);

  const maxDay = daysInMonth(year, month);
  if (day < 1 || day > maxDay) throw new RangeError(`无效日期: ${text}`);
  return { year, month, day, utcMs: Date.UTC(year, month - 1, day) };
}

export function isValidDateString(value) {
  try {
    parseDateStrict(value);
    return true;
  } catch {
    return false;
  }
}

/** 两个日期之差（含首尾）。顺序颠倒返回 0。 */
export function getDaysDiffInclusive(a, b) {
  const start = parseDateStrict(a);
  const end = parseDateStrict(b);
  const ms = end.utcMs - start.utcMs;
  if (ms < 0) return 0;
  return Math.floor(ms / DAY_MS) + 1;
}

/** 当前运行环境日历日期，格式 YYYY-MM-DD。 */
export function todayLocal(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 到期当天返回 1，到期后返回 0。 */
export function remainingDays(endDate, today = todayLocal()) {
  return Math.max(0, getDaysDiffInclusive(today, endDate));
}

export function daysInMonth(year, month) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 0;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * 核心剩余价值计算。
 * cycle 仅作套餐标签；价值始终按用户填写的实际起止日期计算。
 */
export function calcResidualValue({ price, startDate, endDate, cycle = 'custom', today }) {
  if (!(typeof price === 'number' && Number.isFinite(price) && price >= 0)) {
    throw new TypeError('price 必须是非负有限数字');
  }
  if (!['monthly', 'yearly', 'custom'].includes(cycle)) {
    throw new TypeError('cycle 必须是 monthly、yearly 或 custom');
  }

  const start = parseDateStrict(startDate);
  const end = parseDateStrict(endDate);
  if (end.utcMs <= start.utcMs) throw new RangeError('到期日期必须晚于开始日期');

  const totalDays = getDaysDiffInclusive(startDate, endDate);
  const leftDays = remainingDays(endDate, today);
  const ratio = totalDays > 0 ? Math.max(0, Math.min(1, leftDays / totalDays)) : 0;
  const value = price * ratio;

  return { totalDays, leftDays, ratio, value, cycle };
}
