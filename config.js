import { randomBytes } from 'node:crypto';
import { SERVICES } from './services.js';

// Ключ - день недели (0 - воскресенье), значение - часы работы или null для выходного.
const WORK_HOURS = {
  0: null,
  1: { open: '10:00', close: '20:00' },
  2: { open: '10:00', close: '20:00' },
  3: { open: '10:00', close: '20:00' },
  4: { open: '10:00', close: '20:00' },
  5: { open: '10:00', close: '20:00' },
  6: { open: '10:00', close: '18:00' },
};

export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 3001,
    studioName: env.STUDIO_NAME || 'Студия красоты',
    timezone: env.STUDIO_TZ || 'Europe/Moscow',
    // Шаг сетки слотов, минут.
    stepMin: 30,
    // На сколько дней вперёд открыта запись.
    horizonDays: 21,
    // За сколько минут до начала запись на сегодня закрывается.
    leadMin: 60,
    hours: WORK_HOURS,
    services: SERVICES,
    dataFile: env.DATA_FILE || null,
    // Без ADMIN_TOKEN токен генерируется при каждом запуске и печатается в консоль.
    adminToken: env.ADMIN_TOKEN || randomBytes(16).toString('hex'),
    adminTokenGenerated: !env.ADMIN_TOKEN,
  };
}
