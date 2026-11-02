import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Хранилище записей. Без file живёт в памяти, с file сохраняется в JSON
 * (запись во временный файл и переименование, чтобы не получить обрезанный JSON).
 * Операции синхронные, поэтому две записи на одно время не могут проскочить одновременно.
 */
export function createStore({ file = null } = {}) {
  let bookings = [];

  if (file && existsSync(file)) {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed)) {
      throw new Error(`Файл данных ${file} повреждён: ожидался массив записей`);
    }
    bookings = parsed;
  }

  const persist = () => {
    if (!file) return;
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(bookings, null, 2));
    renameSync(tmp, file);
  };

  return {
    list({ date } = {}) {
      return bookings
        .filter((b) => !date || b.date === date)
        .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    },

    add(data) {
      const booking = { id: randomUUID(), createdAt: new Date().toISOString(), ...data };
      bookings.push(booking);
      persist();
      return booking;
    },

    remove(id) {
      const index = bookings.findIndex((b) => b.id === id);
      if (index === -1) return false;
      bookings.splice(index, 1);
      persist();
      return true;
    },
  };
}
