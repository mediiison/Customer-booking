// Чистые функции расписания: никаких обращений к часам, файлам и сети.
// Даты - строки YYYY-MM-DD, время - строки HH:MM, всё в часовом поясе студии.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 86_400_000;

export function isValidDate(str) {
  if (typeof str !== 'string') return false;
  const m = DATE_RE.exec(str);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidTime(str) {
  return typeof str === 'string' && TIME_RE.test(str);
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toUtcMs(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** День недели: 0 - воскресенье, 6 - суббота. */
export function weekday(date) {
  return new Date(toUtcMs(date)).getUTCDay();
}

export function addDays(date, days) {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Текущие дата и время в часовом поясе студии. */
export function nowInTimezone(timeZone, instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Интервалы [aStart, aEnd) и [bStart, bEnd) пересекаются. Встык - не пересекаются. */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Свободные времена начала для услуги заданной длительности.
 * @param {{open: string, close: string} | null} hours часы работы дня, null - выходной
 * @param {number} durationMin длительность услуги
 * @param {{start: string, end: string}[]} bookings записи этого дня
 * @param {number} stepMin шаг сетки
 * @param {number} earliestMin раньше этой минуты дня начинать нельзя
 */
export function getAvailableSlots({ hours, durationMin, bookings = [], stepMin = 30, earliestMin = 0 }) {
  if (!hours) return [];
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const busy = bookings.map((b) => [toMinutes(b.start), toMinutes(b.end)]);
  const slots = [];
  for (let start = open; start + durationMin <= close; start += stepMin) {
    if (start < earliestMin) continue;
    const end = start + durationMin;
    if (busy.some(([bs, be]) => overlaps(start, end, bs, be))) continue;
    slots.push(toHHMM(start));
  }
  return slots;
}

/**
 * Ближайшее свободное окно, начиная с сегодняшнего дня.
 * @returns {{date: string, time: string} | null}
 */
export function findNextFree({ today, nowMin, leadMin = 0, days, durationMin, stepMin, hoursFor, getBookings }) {
  for (let i = 0; i <= days; i += 1) {
    const date = addDays(today, i);
    const slots = getAvailableSlots({
      hours: hoursFor(date),
      durationMin,
      bookings: getBookings(date),
      stepMin,
      earliestMin: i === 0 ? nowMin + leadMin : 0,
    });
    if (slots.length > 0) return { date, time: slots[0] };
  }
  return null;
}
