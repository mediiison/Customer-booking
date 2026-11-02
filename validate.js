import { HttpError } from './errors.js';
import { isValidDate, isValidTime } from './schedule.js';

/** Приводит телефон к виду +7XXXXXXXXXX. Международные номера оставляет как +<цифры>. */
export function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return `+7${digits.slice(1)}`;
  if (digits.length === 10) return `+7${digits}`;
  if (raw.trim().startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

const bad = (message, field) => new HttpError(400, message, 'VALIDATION', field);

/** Проверяет тело запроса на создание записи и возвращает очищенные данные. */
export function parseBookingInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Нужно передать данные записи', 'BAD_REQUEST');
  }
  const { serviceId, date, time, clientName, phone, comment } = body;

  if (typeof serviceId !== 'string' || serviceId === '') throw bad('Выберите услугу', 'serviceId');
  if (!isValidDate(date)) throw bad('Выберите дату', 'date');
  if (!isValidTime(time)) throw bad('Выберите время', 'time');

  const name = typeof clientName === 'string' ? clientName.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > 60) throw bad('Имя должно быть от 2 до 60 символов', 'clientName');

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw bad('Проверьте номер телефона', 'phone');

  const note = typeof comment === 'string' ? comment.trim() : '';
  if (note.length > 300) throw bad('Комментарий не длиннее 300 символов', 'comment');

  return { serviceId, date, time, clientName: name, phone: normalizedPhone, comment: note };
}
