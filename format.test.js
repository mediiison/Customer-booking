import { describe, expect, test } from 'vitest';
import {
  addDays,
  buildDays,
  describeDay,
  formatDateLong,
  formatDayNumber,
  formatDuration,
  formatPhone,
  formatPrice,
  groupByCategory,
  pluralRu,
  weekdayOf,
} from './format.js';

// Пробелы в числах зависят от версии ICU (обычный, неразрывный, узкий), поэтому сравниваем без них.
const squash = (s) => s.replace(/\s/g, ' ');

describe('даты', () => {
  test('addDays переходит через границы месяца и года', () => {
    expect(addDays('2030-01-31', 1)).toBe('2030-02-01');
    expect(addDays('2029-12-31', 1)).toBe('2030-01-01');
    expect(addDays('2030-03-01', -1)).toBe('2030-02-28');
  });

  test('weekdayOf: понедельник - 1, воскресенье - 0', () => {
    expect(weekdayOf('2030-01-14')).toBe(1);
    expect(weekdayOf('2030-01-20')).toBe(0);
  });

  test('formatDateLong и formatDayNumber', () => {
    expect(formatDateLong('2030-01-15')).toBe('Вторник, 15 января');
    expect(formatDayNumber('2030-01-05')).toBe('5');
  });

  test('describeDay: сегодня, завтра, дальше - число и месяц', () => {
    expect(describeDay('2030-01-14', '2030-01-14')).toBe('Сегодня');
    expect(describeDay('2030-01-15', '2030-01-14')).toBe('Завтра');
    expect(describeDay('2030-01-21', '2030-01-14')).toBe('21 января');
  });

  test('buildDays включает сегодня и последний день горизонта, помечает выходные', () => {
    const hours = { 0: null, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
    const days = buildDays('2030-01-14', 21, hours);
    expect(days).toHaveLength(22);
    expect(days[0]).toEqual({ date: '2030-01-14', closed: false });
    expect(days.at(-1).date).toBe('2030-02-04');
    expect(days.find((d) => d.date === '2030-01-20').closed).toBe(true);
  });
});

describe('числа и слова', () => {
  test('formatPrice', () => {
    expect(squash(formatPrice(1500))).toBe('1 500 ₽');
    expect(squash(formatPrice(450))).toBe('450 ₽');
  });

  test('formatDuration', () => {
    expect(formatDuration(45)).toBe('45 мин');
    expect(formatDuration(60)).toBe('1 ч');
    expect(formatDuration(90)).toBe('1 ч 30 мин');
    expect(formatDuration(120)).toBe('2 ч');
  });

  test('formatPhone группирует российские номера и не трогает остальные', () => {
    expect(formatPhone('+79261234567')).toBe('+7 926 123-45-67');
    expect(formatPhone('+491512345678')).toBe('+491512345678');
  });

  test('pluralRu', () => {
    const forms = ['запись', 'записи', 'записей'];
    expect(pluralRu(1, forms)).toBe('запись');
    expect(pluralRu(2, forms)).toBe('записи');
    expect(pluralRu(5, forms)).toBe('записей');
    expect(pluralRu(11, forms)).toBe('записей');
    expect(pluralRu(21, forms)).toBe('запись');
    expect(pluralRu(0, forms)).toBe('записей');
  });
});

describe('groupByCategory', () => {
  test('сохраняет порядок категорий и услуг', () => {
    const services = [
      { id: 'a', category: 'Ногти' },
      { id: 'b', category: 'Волосы' },
      { id: 'c', category: 'Ногти' },
    ];
    const groups = groupByCategory(services);
    expect(groups.map(([name]) => name)).toEqual(['Ногти', 'Волосы']);
    expect(groups[0][1].map((s) => s.id)).toEqual(['a', 'c']);
  });
});
