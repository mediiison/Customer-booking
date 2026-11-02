// Форматирование дат, цен и длительностей. Даты - строки YYYY-MM-DD,
// считаем в UTC, чтобы часовой пояс браузера не сдвигал день.

const DAY_MS = 86_400_000;

function utc(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const formatter = (options) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', ...options });
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const addDays = (date, days) => new Date(utc(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);

/** 0 - воскресенье, 6 - суббота. */
export const weekdayOf = (date) => utc(date).getUTCDay();

/** «Вторник, 15 января» */
export const formatDateLong = (date) =>
  capitalize(formatter({ weekday: 'long', day: 'numeric', month: 'long' }).format(utc(date)));

/** «Вт» */
export const formatWeekdayShort = (date) => capitalize(formatter({ weekday: 'short' }).format(utc(date)));

/** «15» */
export const formatDayNumber = (date) => String(utc(date).getUTCDate());

/** «янв» */
export const formatMonthShort = (date) => formatter({ month: 'short' }).format(utc(date)).replace('.', '');

/** «Сегодня», «Завтра» или «21 января». */
export function describeDay(date, today) {
  if (date === today) return 'Сегодня';
  if (date === addDays(today, 1)) return 'Завтра';
  return formatter({ day: 'numeric', month: 'long' }).format(utc(date));
}

export const formatPrice = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

/** 45 -> «45 мин», 60 -> «1 ч», 90 -> «1 ч 30 мин». */
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

/** +79261234567 -> «+7 926 123-45-67». Другие номера возвращает как есть. */
export function formatPhone(phone) {
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+7 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : phone;
}

/** Склонение: pluralRu(2, ['запись', 'записи', 'записей']) -> «записи». */
export function pluralRu(n, [one, few, many]) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** Группирует услуги по категориям, сохраняя порядок. */
export function groupByCategory(services) {
  const groups = new Map();
  for (const service of services) {
    if (!groups.has(service.category)) groups.set(service.category, []);
    groups.get(service.category).push(service);
  }
  return [...groups.entries()];
}

/** Дни, открытые для записи: от сегодня до today + count включительно. */
export function buildDays(today, count, hours) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const date = addDays(today, i);
    return { date, closed: !hours[weekdayOf(date)] };
  });
}
