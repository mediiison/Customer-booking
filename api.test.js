import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createStore } from '../src/store.js';

const TOKEN = 'test-token';
// 2030-01-14 - понедельник, 09:00. 2030-01-20 - воскресенье.
const NOW = { date: '2030-01-14', minutes: 9 * 60 };
const MONDAY = '2030-01-14';
const TUESDAY = '2030-01-15';
const SUNDAY = '2030-01-20';

let server;
let base;
let tmpDir;
let dataFile;

before(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'booking-test-'));
  dataFile = join(tmpDir, 'data', 'bookings.json');
  const config = loadConfig({ ADMIN_TOKEN: TOKEN });
  const app = createApp({ config, store: createStore({ file: dataFile }), now: () => NOW });
  server = app.listen(0);
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

const booking = (overrides = {}) => ({
  serviceId: 'haircut',
  date: TUESDAY,
  time: '12:00',
  clientName: 'Мария',
  phone: '8 926 123-45-67',
  ...overrides,
});

test('config и services отдают данные для клиента', async () => {
  const cfg = await call('/config');
  assert.equal(cfg.status, 200);
  assert.equal(cfg.data.today, MONDAY);
  assert.equal(cfg.data.hours[0], null);

  const services = await call('/services');
  assert.equal(services.status, 200);
  assert.ok(services.data.length > 0);
  assert.ok(services.data.every((s) => s.id && s.name && s.durationMin > 0 && s.price > 0));
});

test('слоты на сегодня начинаются не раньше чем через leadMin от текущего времени', async () => {
  const { status, data } = await call(`/slots?date=${MONDAY}&serviceId=haircut`);
  assert.equal(status, 200);
  assert.equal(data.slots[0], '10:00'); // сейчас 09:00, запас 60 минут
  assert.equal(data.closed, false);
});

test('в воскресенье студия закрыта', async () => {
  const { status, data } = await call(`/slots?date=${SUNDAY}&serviceId=haircut`);
  assert.equal(status, 200);
  assert.equal(data.closed, true);
  assert.deepEqual(data.slots, []);
});

test('слоты: неверные параметры дают 400', async () => {
  const cases = [
    `/slots?serviceId=haircut`,
    `/slots?date=2030-02-30&serviceId=haircut`,
    `/slots?date=2029-12-31&serviceId=haircut`, // в прошлом
    `/slots?date=2030-02-05&serviceId=haircut`, // дальше горизонта в 21 день
    `/slots?date=${TUESDAY}`,
    `/slots?date=${TUESDAY}&serviceId=unknown`,
  ];
  for (const path of cases) {
    const { status, data } = await call(path);
    assert.equal(status, 400, path);
    assert.ok(data.error, path);
  }
});

test('последний допустимый день горизонта открыт для записи', async () => {
  const { status } = await call(`/slots?date=2030-02-04&serviceId=haircut`);
  assert.equal(status, 200);
});

test('запись: создаётся, занимает слот, второй такой же запрос получает 409', async () => {
  const created = await call('/bookings', { method: 'POST', body: booking() });
  assert.equal(created.status, 201);
  assert.equal(created.data.start, '12:00');
  assert.equal(created.data.end, '13:00');
  assert.equal(created.data.price, 2200);
  assert.equal(created.data.phone, undefined, 'телефон клиенту не возвращаем');

  const slots = await call(`/slots?date=${TUESDAY}&serviceId=haircut`);
  assert.ok(!slots.data.slots.includes('12:00'));
  assert.ok(!slots.data.slots.includes('12:30'));
  assert.ok(slots.data.slots.includes('11:00'));
  assert.ok(slots.data.slots.includes('13:00'));

  const again = await call('/bookings', { method: 'POST', body: booking({ clientName: 'Ольга' }) });
  assert.equal(again.status, 409);
  assert.equal(again.data.code, 'SLOT_TAKEN');

  // пересекающийся по времени слот другой услуги тоже занят
  const overlapping = await call('/bookings', {
    method: 'POST',
    body: booking({ serviceId: 'nails-gel', time: '11:30' }),
  });
  assert.equal(overlapping.status, 409);
});

test('запись: невалидные данные и недоступное время', async () => {
  const noName = await call('/bookings', { method: 'POST', body: booking({ clientName: '' }) });
  assert.equal(noName.status, 400);
  assert.equal(noName.data.field, 'clientName');

  const sunday = await call('/bookings', { method: 'POST', body: booking({ date: SUNDAY }) });
  assert.equal(sunday.status, 409);

  const tooEarly = await call('/bookings', { method: 'POST', body: booking({ date: MONDAY, time: '09:30' }) });
  assert.equal(tooEarly.status, 409);

  const past = await call('/bookings', { method: 'POST', body: booking({ date: '2030-01-13' }) });
  assert.equal(past.status, 400);
  assert.equal(past.data.code, 'OUT_OF_RANGE');
});

test('битый JSON даёт 400, а не 500', async () => {
  const res = await fetch(`${base}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{не json',
  });
  assert.equal(res.status, 400);
});

test('список записей и отмена требуют токен мастера', async () => {
  assert.equal((await call('/bookings')).status, 401);
  assert.equal((await call('/bookings', { token: 'wrong-token' })).status, 401);
  assert.equal((await call('/bookings/abc', { method: 'DELETE' })).status, 401);

  const list = await call(`/bookings?date=${TUESDAY}`, { token: TOKEN });
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].clientName, 'Мария');
  assert.equal(list.data[0].phone, '+79261234567');
});

test('отмена записи освобождает слот', async () => {
  const list = await call(`/bookings?date=${TUESDAY}`, { token: TOKEN });
  const { id } = list.data[0];

  const removed = await call(`/bookings/${id}`, { method: 'DELETE', token: TOKEN });
  assert.equal(removed.status, 204);

  const slots = await call(`/slots?date=${TUESDAY}&serviceId=haircut`);
  assert.ok(slots.data.slots.includes('12:00'));

  const missing = await call(`/bookings/${id}`, { method: 'DELETE', token: TOKEN });
  assert.equal(missing.status, 404);
});

test('записи сохраняются в файл', async () => {
  await call('/bookings', { method: 'POST', body: booking({ time: '15:00', clientName: 'Ирина' }) });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'));
  assert.ok(saved.some((b) => b.clientName === 'Ирина' && b.start === '15:00'));
});

test('next-free: сегодня в 09:00 ближайшее окно в 10:00, дальше учитывает занятое', async () => {
  const first = await call('/next-free?serviceId=haircut');
  assert.deepEqual(first.data.next, { date: MONDAY, time: '10:00' });

  await call('/bookings', { method: 'POST', body: booking({ date: MONDAY, time: '10:00', clientName: 'Анна' }) });
  const second = await call('/next-free?serviceId=haircut');
  assert.deepEqual(second.data.next, { date: MONDAY, time: '11:00' });

  const noService = await call('/next-free');
  assert.equal(noService.status, 200);
  assert.ok(noService.data.next);
});

test('неизвестный адрес API отдаёт JSON 404', async () => {
  const { status, data } = await call('/nope');
  assert.equal(status, 404);
  assert.equal(data.code, 'NOT_FOUND');
});
