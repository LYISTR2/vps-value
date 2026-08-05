import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDaysDiffInclusive,
  todayLocal,
  remainingDays,
  daysInMonth,
  calcResidualValue,
} from '../src/calc.js';

test('getDaysDiffInclusive 含首尾', () => {
  assert.equal(getDaysDiffInclusive('2026-08-01', '2026-08-31'), 31);
  assert.equal(getDaysDiffInclusive('2026-08-01', '2026-08-01'), 1);
  assert.equal(getDaysDiffInclusive('2026-01-01', '2026-12-31'), 365);
  assert.equal(getDaysDiffInclusive('2026-02-01', '2026-02-28'), 28); // 非闰年
  assert.equal(getDaysDiffInclusive('2028-02-01', '2028-02-29'), 29); // 闰年
});

test('getDaysDiffInclusive 顺序颠倒返回 0', () => {
  assert.equal(getDaysDiffInclusive('2026-08-31', '2026-08-01'), 0);
});

test('todayLocal 返回 YYYY-MM-DD', () => {
  const s = todayLocal();
  assert.match(s, /^\d{4}-\d{2}-\d{2}$/);
});

test('remainingDays 到期当天为 1, 过期为 0', () => {
  // 依赖今天日期，动态断言
  const today = todayLocal();
  assert.equal(remainingDays(today), 1);
  assert.equal(remainingDays('2000-01-01'), 0); // 早已过期
});

test('daysInMonth', () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 1), 31);
  assert.equal(daysInMonth(2026, 4), 30);
});

test('calcResidualValue 基础场景', () => {
  // 8/1 开始, 8/31 到期, 31 天, 今天起剩余天数 = remainingDays('2026-08-31')
  // 若今天是 8/5 → left = 27
  const result = calcResidualValue({
    price: 100,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    cycle: 'monthly',
  });
  assert.equal(result.totalDays, 31);
  assert.ok(result.leftDays >= 1 && result.leftDays <= 31);
  assert.ok(result.ratio >= 0 && result.ratio <= 1);
  assert.equal(result.value, 100 * result.ratio);
});

test('calcResidualValue 已过期 → 价值 0', () => {
  const result = calcResidualValue({
    price: 100,
    startDate: '2020-01-01',
    endDate: '2020-01-31',
    cycle: 'monthly',
  });
  assert.equal(result.leftDays, 0);
  assert.equal(result.value, 0);
  assert.equal(result.ratio, 0);
});

test('calcResidualValue 价格 0 → 价值 0', () => {
  const result = calcResidualValue({
    price: 0,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    cycle: 'monthly',
  });
  assert.equal(result.value, 0);
});

test('calcResidualValue 未来套餐 ratio 上限 1', () => {
  // 开始日期在未来 → 剩余天数 ≥ 总天数 → ratio 上限 1
  const farFuture = '2099-01-01';
  const result = calcResidualValue({
    price: 200,
    startDate: '2099-01-01',
    endDate: '2099-02-01',
    cycle: 'monthly',
  });
  assert.ok(result.ratio <= 1);
  assert.ok(result.value <= 200);
});
