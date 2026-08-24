import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcResidualValue,
  daysInMonth,
  getDaysDiffInclusive,
  isValidDateString,
  parseDateStrict,
  remainingDays,
  todayLocal,
} from '../src/calc.js';

test('严格日期解析与闰年校验', () => {
  assert.deepEqual(parseDateStrict('2028-02-29'), {
    year: 2028, month: 2, day: 29, utcMs: Date.UTC(2028, 1, 29),
  });
  assert.equal(isValidDateString('2026-02-29'), false);
  assert.equal(isValidDateString('2026-02-31'), false);
  assert.equal(isValidDateString('2026-13-01'), false);
  assert.equal(isValidDateString('2026-8-01'), false);
  assert.equal(isValidDateString('2026-08-01'), true);
});

test('getDaysDiffInclusive 含首尾且跨年正确', () => {
  assert.equal(getDaysDiffInclusive('2026-08-01', '2026-08-31'), 31);
  assert.equal(getDaysDiffInclusive('2026-08-01', '2026-08-01'), 1);
  assert.equal(getDaysDiffInclusive('2026-01-01', '2026-12-31'), 365);
  assert.equal(getDaysDiffInclusive('2028-02-01', '2028-02-29'), 29);
  assert.equal(getDaysDiffInclusive('2026-08-31', '2026-08-01'), 0);
});

test('todayLocal 返回 YYYY-MM-DD', () => {
  assert.match(todayLocal(new Date(2026, 7, 24, 23, 59)), /^2026-08-24$/);
});

test('remainingDays 到期当天为 1，过期为 0', () => {
  assert.equal(remainingDays('2026-08-24', '2026-08-24'), 1);
  assert.equal(remainingDays('2026-08-23', '2026-08-24'), 0);
});

test('daysInMonth', () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 13), 0);
});

test('calcResidualValue 使用实际区间，cycle 仅作标签', () => {
  const monthly = calcResidualValue({
    price: 100,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    cycle: 'monthly',
    today: '2026-08-24',
  });
  const yearlyLabel = calcResidualValue({
    price: 100,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    cycle: 'yearly',
    today: '2026-08-24',
  });
  assert.equal(monthly.totalDays, 31);
  assert.equal(monthly.leftDays, 8);
  assert.equal(monthly.ratio, 8 / 31);
  assert.equal(monthly.value, 100 * 8 / 31);
  assert.equal(yearlyLabel.value, monthly.value);
  assert.equal(yearlyLabel.cycle, 'yearly');
});

test('calcResidualValue 过期、未来和非法输入', () => {
  const expired = calcResidualValue({ price: 100, startDate: '2020-01-01', endDate: '2020-01-31', today: '2026-01-01' });
  assert.equal(expired.value, 0);
  const future = calcResidualValue({ price: 200, startDate: '2099-01-01', endDate: '2099-02-01', today: '2026-01-01' });
  assert.equal(future.ratio, 1);
  assert.equal(future.value, 200);
  assert.throws(() => calcResidualValue({ price: -1, startDate: '2026-01-01', endDate: '2026-02-01' }), /price/);
  assert.throws(() => calcResidualValue({ price: 1, startDate: '2026-02-31', endDate: '2026-03-02' }), /无效日期/);
  assert.throws(() => calcResidualValue({ price: 1, startDate: '2026-03-02', endDate: '2026-03-02' }), /必须晚于/);
  assert.throws(() => calcResidualValue({ price: 1, startDate: '2026-01-01', endDate: '2026-02-01', cycle: 'weekly' }), /cycle/);
});
