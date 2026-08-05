/**
 * 日期计算工具 — 纯函数，无副作用
 *
 * 所有日期均以 YYYY-MM-DD 字符串输入/输出（UTC 午夜解析），
 * 避免本地时区干扰。
 */

const DAY_MS = 86_400_000;

/**
 * 两个日期之差（天数），含首尾。
 * 用 UTC 午夜解析避免时区偏移。
 * 例：getDaysDiffInclusive('2026-08-01', '2026-08-31') → 31
 */
export function getDaysDiffInclusive(a, b) {
  const ms = Date.UTC(
    ...b.split('-').map(Number),
    0, 0, 0, 0
  ) - Date.UTC(
    ...a.split('-').map(Number),
    0, 0, 0, 0
  );
  if (ms < 0) return 0;
  return Math.floor(ms / DAY_MS) + 1; // 含首尾 +1
}

/**
 * 今天（本地时区）的 YYYY-MM-DD 字符串
 * 使用 toLocaleDateString('en-CA') 获取本地日期
 */
export function todayLocal() {
  return new Date().toLocaleDateString('en-CA'); // en-CA → YYYY-MM-DD
}

/**
 * 计算剩余天数（含首尾，最小 0）
 * 到期当天返回 1（含当天），到期后返回 0
 */
export function remainingDays(endDate) {
  const today = todayLocal();
  return Math.max(0, getDaysDiffInclusive(today, endDate));
}

/**
 * 某月天数（28/29/30/31）
 */
export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 核心剩余价值计算
 *
 * @param {Object} opts
 * @param {number}  opts.price      总价
 * @param {string}  opts.startDate  YYYY-MM-DD
 * @param {string}  opts.endDate    YYYY-MM-DD
 * @param {'monthly'|'yearly'} opts.cycle 计费周期
 * @returns {{ totalDays: number, leftDays: number, ratio: number, value: number }}
 */
export function calcResidualValue({ price, startDate, endDate, cycle }) {
  const totalDays = getDaysDiffInclusive(startDate, endDate);
  const leftDays = remainingDays(endDate);
  const ratio = totalDays > 0 ? Math.min(1, leftDays / totalDays) : 0;
  const value = price * ratio;

  return { totalDays, leftDays, ratio, value };
}