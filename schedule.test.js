import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  findNextFree,
  getAvailableSlots,
  isValidDate,
  isValidTime,
  nowInTimezone,
  overlaps,
  toHHMM,
  toMinutes,
  weekday,
} from '../src/schedule.js';

const workDay = { open: '10:00', close: '20:00' };

test('toMinutes и toHHMM обратимы', () => {
  assert.equal(toMinutes('00:00'), 0);
  assert.equal(toMinutes('10:30'), 630);
  assert.equal(toHHMM(630), '10:30');
  assert.equal(toHHMM(toMinutes('19:45')), '19:45');
});

test('isValidDate отсекает несуществующие даты', () => {
  assert.equal(isValidDate('2030-02-28'), true);
  assert.equal(isValidDate('2030-02-30'), false);
  assert.equal(isValidDate('2030-13-01'), false);
  assert.equal(isValidDate('30-01-2030'), false);
  assert.equal(isValidDate(undefined), false);
  assert.equal(isValidDate(20300101), false);
});

test('isValidTime принимает только HH:MM', () => {
  assert.equal(isValidTime('09:05'), true);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('9:05'), false);
  assert.equal(isValidTime('10:60'), false);
});

test('weekday и addDays работают через границы месяца и года', () => {
  assert.equal(weekday('2030-01-14'), 1); // понедельник
  assert.equal(weekday('2030-01-20'), 0); // воскресенье
  assert.equal(addDays('2030-01-31', 1), '2030-02-01');
  assert.equal(addDays('2029-12-31', 1), '2030-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29'); // високосный год
  assert.equal(addDays('2030-03-01', -1), '2030-02-28');
});

test('nowInTimezone считает время в заданном поясе, а не в серверном', () => {
  const instant = new Date('2030-01-14T21:30:00Z');
  assert.deepEqual(nowInTimezone('Europe/Moscow', instant), { date: '2030-01-15', minutes: 30 });
  assert.deepEqual(nowInTimezone('UTC', instant), { date: '2030-01-14', minutes: 21 * 60 + 30 });
});

test('overlaps: встык не считается пересечением', () => {
  assert.equal(overlaps(600, 660, 660, 720), false);
  assert.equal(overlaps(600, 660, 630, 700), true);
  assert.equal(overlaps(600, 720, 630, 660), true);
});

test('пустой день: слоты от открытия до последнего, который помещается до закрытия', () => {
  const slots = getAvailableSlots({ hours: workDay, durationMin: 60, stepMin: 30 });
  assert.equal(slots[0], '10:00');
  assert.equal(slots.at(-1), '19:00');
  assert.equal(slots.length, 19);
});

test('услуга длиннее рабочего дня и выходной дают пустой список', () => {
  assert.deepEqual(getAvailableSlots({ hours: workDay, durationMin: 11 * 60 }), []);
  assert.deepEqual(getAvailableSlots({ hours: null, durationMin: 60 }), []);
});

test('существующая запись закрывает пересекающиеся слоты, но не соседние', () => {
  const slots = getAvailableSlots({
    hours: workDay,
    durationMin: 60,
    bookings: [{ start: '12:00', end: '13:00' }],
  });
  assert.ok(slots.includes('11:00'), '11:00-12:00 заканчивается ровно к началу записи');
  assert.ok(!slots.includes('11:30'));
  assert.ok(!slots.includes('12:00'));
  assert.ok(!slots.includes('12:30'));
  assert.ok(slots.includes('13:00'));
});

test('длинная услуга не влезает в окно между записями', () => {
  const bookings = [
    { start: '10:00', end: '11:00' },
    { start: '12:00', end: '13:00' },
  ];
  const slots = getAvailableSlots({ hours: workDay, durationMin: 90, bookings });
  assert.ok(!slots.includes('11:00'), 'окно 11:00-12:00 короче 90 минут');
  assert.ok(slots.includes('13:00'));
});

test('earliestMin скрывает прошедшие слоты', () => {
  const slots = getAvailableSlots({ hours: workDay, durationMin: 60, earliestMin: 14 * 60 + 10 });
  assert.equal(slots[0], '14:30');
});

test('findNextFree: сегодня уже поздно, берёт первый слот следующего рабочего дня', () => {
  const hoursFor = (date) => (weekday(date) === 0 ? null : workDay);
  const found = findNextFree({
    today: '2030-01-19', // суббота
    nowMin: 19 * 60,
    leadMin: 60,
    days: 21,
    durationMin: 60,
    stepMin: 30,
    hoursFor,
    getBookings: () => [],
  });
  // после 20:00 в субботу ничего не поместится, воскресенье выходной
  assert.deepEqual(found, { date: '2030-01-21', time: '10:00' });
});

test('findNextFree учитывает занятые записи и возвращает null, если окон нет', () => {
  const hoursFor = () => workDay;
  const allDay = [{ start: '10:00', end: '20:00' }];
  const base = { today: '2030-01-14', nowMin: 0, leadMin: 0, days: 3, durationMin: 60, stepMin: 30, hoursFor };

  const busyFirstDay = findNextFree({ ...base, getBookings: (d) => (d === '2030-01-14' ? allDay : []) });
  assert.deepEqual(busyFirstDay, { date: '2030-01-15', time: '10:00' });

  assert.equal(findNextFree({ ...base, getBookings: () => allDay }), null);
});
