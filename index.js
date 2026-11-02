import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createStore } from './store.js';

const config = loadConfig();
const store = createStore({ file: config.dataFile });
const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');

const app = createApp({ config, store, clientDir });

app.listen(config.port, () => {
  console.log(`Сервер запущен: http://localhost:${config.port}`);
  if (config.adminTokenGenerated) {
    console.log(`Токен мастера на этот запуск: ${config.adminToken}`);
    console.log('Чтобы он не менялся, задайте переменную ADMIN_TOKEN.');
  }
});
