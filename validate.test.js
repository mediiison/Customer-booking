import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../src/errors.js';
import { normalizePhone, parseBookingInput } from '../src/validate.js';

test('normalizePhone приводит российские номера к +7XXXXXXXXXX', () => {
  assert.equal(normalizePhone('8 (926) 123-45-67'), '+79261234567');
  assert.equal(normalizePhone('+7 926 123 45 67'), '+79261234567');
  assert.equal(normalizePhone('79261234567'), '+79261234567');
  assert.equal(normalizePhone('926 123 45 67'), '+79261234567');
});

test('normalizePhone пропускает международные номера с плюсом и отклоняет мусор', () => {
  assert.equal(normalizePhone('+49 151 2345678'), '+491512345678');
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('абв'), null);
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone(89261234567), null);
});

const valid = {
  serviceId: 'haircut',
  date: '2030-01-15',
  time: '12:30',
  clientName: '  Мария   Иванова ',
  phone: '8 926 123-45-67',
  comment: '  Первый раз  ',
};

test('parseBookingInput чистит и нормализует корректные данные', () => {
  assert.deepEqual(parseBookingInput(valid), {
    serviceId: 'haircut',
    date: '2030-01-15',
    time: '12:30',
    clientName: 'Мария Иванова',
    phone: '+79261234567',
    comment: 'Первый раз',
  });
});

test('комментарий необязателен', () => {
  const { comment, ...withoutComment } = valid;
  assert.equal(parseBookingInput(withoutComment).comment, '');
});

test('parseBookingInput называет поле, в котором ошибка', () => {
  const cases = [
    [{ ...valid, serviceId: '' }, 'serviceId'],
    [{ ...valid, date: '2030-02-31' }, 'date'],
    [{ ...valid, time: '25:00' }, 'time'],
    [{ ...valid, clientName: 'А' }, 'clientName'],
    [{ ...valid, clientName: 'А'.repeat(61) }, 'clientName'],
    [{ ...valid, phone: '123' }, 'phone'],
    [{ ...valid, comment: 'x'.repeat(301) }, 'comment'],
  ];
  for (const [input, field] of cases) {
    assert.throws(
      () => parseBookingInput(input),
      (err) => err instanceof HttpError && err.status === 400 && err.field === field,
      `ожидалась ошибка в поле ${field}`,
    );
  }
});

test('parseBookingInput отклоняет не-объекты', () => {
  for (const body of [undefined, null, 'строка', 42, []]) {
    assert.throws(() => parseBookingInput(body), (err) => err instanceof HttpError && err.status === 400);
  }
});
