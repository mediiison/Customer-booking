import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import { HttpError } from './errors.js';
import { addDays, findNextFree, getAvailableSlots, isValidDate, nowInTimezone, toHHMM, toMinutes, weekday } from './schedule.js';
import { parseBookingInput } from './validate.js';

function requireAdmin(token) {
  const expected = Buffer.from(token);
  return (req, res, next) => {
    const header = req.get('authorization') ?? '';
    const given = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
    const ok = given.length === expected.length && timingSafeEqual(given, expected);
    if (!ok) throw new HttpError(401, 'Нужен токен мастера', 'UNAUTHORIZED');
    next();
  };
}

/**
 * @param {object} deps
 * @param {ReturnType<import('./config.js').loadConfig>} deps.config
 * @param {ReturnType<import('./store.js').createStore>} deps.store
 * @param {() => {date: string, minutes: number}} [deps.now] подменяется в тестах
 * @param {string} [deps.clientDir] папка со сборкой клиента, если нужно отдавать её отсюда
 */
export function createApp({ config, store, now = () => nowInTimezone(config.timezone), clientDir }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  const servicesById = new Map(config.services.map((s) => [s.id, s]));
  const hoursFor = (date) => config.hours[weekday(date)] ?? null;

  function slotsFor(date, durationMin) {
    const current = now();
    return getAvailableSlots({
      hours: hoursFor(date),
      durationMin,
      bookings: store.list({ date }),
      stepMin: config.stepMin,
      earliestMin: date === current.date ? current.minutes + config.leadMin : 0,
    });
  }

  function assertBookableDate(date) {
    if (!isValidDate(date)) throw new HttpError(400, 'Дата должна быть в формате ГГГГ-ММ-ДД', 'VALIDATION', 'date');
    const today = now().date;
    if (date < today || date > addDays(today, config.horizonDays)) {
      throw new HttpError(400, `Запись открыта на ${config.horizonDays} дней вперёд`, 'OUT_OF_RANGE', 'date');
    }
  }

  function getService(id) {
    const service = servicesById.get(id);
    if (!service) throw new HttpError(400, 'Такой услуги нет в прайс-листе', 'UNKNOWN_SERVICE', 'serviceId');
    return service;
  }

  const api = express.Router();
  const admin = requireAdmin(config.adminToken);

  api.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  api.get('/config', (req, res) => {
    res.json({
      studioName: config.studioName,
      timezone: config.timezone,
      stepMin: config.stepMin,
      horizonDays: config.horizonDays,
      leadMin: config.leadMin,
      hours: config.hours,
      today: now().date,
    });
  });

  api.get('/services', (req, res) => {
    res.json(config.services);
  });

  api.get('/slots', (req, res) => {
    const { date, serviceId } = req.query;
    assertBookableDate(date);
    const service = getService(serviceId);
    res.json({
      date,
      serviceId: service.id,
      closed: hoursFor(date) === null,
      slots: slotsFor(date, service.durationMin),
    });
  });

  // Без serviceId считает по самой короткой услуге.
  api.get('/next-free', (req, res) => {
    const { serviceId } = req.query;
    const durationMin = serviceId
      ? getService(serviceId).durationMin
      : Math.min(...config.services.map((s) => s.durationMin));
    const current = now();
    const found = findNextFree({
      today: current.date,
      nowMin: current.minutes,
      leadMin: config.leadMin,
      days: config.horizonDays,
      durationMin,
      stepMin: config.stepMin,
      hoursFor,
      getBookings: (date) => store.list({ date }),
    });
    res.json({ next: found });
  });

  api.post('/bookings', (req, res) => {
    const input = parseBookingInput(req.body);
    const service = getService(input.serviceId);
    assertBookableDate(input.date);

    if (!slotsFor(input.date, service.durationMin).includes(input.time)) {
      throw new HttpError(409, 'Это время уже занято. Выберите другое', 'SLOT_TAKEN', 'time');
    }

    const booking = store.add({
      serviceId: service.id,
      serviceName: service.name,
      durationMin: service.durationMin,
      price: service.price,
      date: input.date,
      start: input.time,
      end: toHHMM(toMinutes(input.time) + service.durationMin),
      clientName: input.clientName,
      phone: input.phone,
      comment: input.comment,
    });

    // Клиенту возвращаем только то, что нужно для подтверждения.
    res.status(201).json({
      id: booking.id,
      serviceName: booking.serviceName,
      date: booking.date,
      start: booking.start,
      end: booking.end,
      price: booking.price,
    });
  });

  api.get('/bookings', admin, (req, res) => {
    const { date } = req.query;
    if (date !== undefined && !isValidDate(date)) {
      throw new HttpError(400, 'Дата должна быть в формате ГГГГ-ММ-ДД', 'VALIDATION', 'date');
    }
    res.json(store.list({ date }));
  });

  api.delete('/bookings/:id', admin, (req, res) => {
    if (!store.remove(req.params.id)) throw new HttpError(404, 'Запись не найдена', 'NOT_FOUND');
    res.status(204).end();
  });

  api.use((req, res) => {
    res.status(404).json({ error: 'Такого адреса нет', code: 'NOT_FOUND' });
  });

  app.use('/api', api);

  if (clientDir && existsSync(join(clientDir, 'index.html'))) {
    app.use(express.static(clientDir));
    app.get('*', (req, res) => res.sendFile(join(clientDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      const body = { error: err.message, code: err.code };
      if (err.field) body.field = err.field;
      return res.status(err.status).json(body);
    }
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(err.status).json({ error: 'Не удалось прочитать запрос', code: 'BAD_REQUEST' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Что-то пошло не так на сервере', code: 'INTERNAL' });
  });

  return app;
}
