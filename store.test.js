import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../src/store.js';

const sample = (overrides = {}) => ({ date: '2030-01-15', start: '12:00', end: '13:00', clientName: 'Мария', ...overrides });

test('список отсортирован по дате и времени и фильтруется по дню', () => {
  const store = createStore();
  store.add(sample({ date: '2030-01-16', start: '10:00' }));
  store.add(sample({ date: '2030-01-15', start: '15:00' }));
  store.add(sample({ date: '2030-01-15', start: '11:00' }));

  assert.deepEqual(
    store.list().map((b) => `${b.date} ${b.start}`),
    ['2030-01-15 11:00', '2030-01-15 15:00', '2030-01-16 10:00'],
  );
  assert.equal(store.list({ date: '2030-01-15' }).length, 2);
});

test('remove удаляет запись и сообщает, была ли она', () => {
  const store = createStore();
  const { id } = store.add(sample());
  assert.equal(store.remove(id), true);
  assert.equal(store.remove(id), false);
  assert.equal(store.list().length, 0);
});

test('данные переживают перезапуск, если задан файл', () => {
  const dir = mkdtempSync(join(tmpdir(), 'store-test-'));
  try {
    const file = join(dir, 'nested', 'bookings.json');
    const first = createStore({ file });
    const { id } = first.add(sample({ clientName: 'Ольга' }));

    const second = createStore({ file });
    assert.equal(second.list().length, 1);
    assert.equal(second.list()[0].clientName, 'Ольга');

    second.remove(id);
    assert.equal(createStore({ file }).list().length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('повреждённый файл даёт понятную ошибку, а не молча затирается', () => {
  const dir = mkdtempSync(join(tmpdir(), 'store-test-'));
  try {
    const file = join(dir, 'bookings.json');
    writeFileSync(file, '{"это": "не массив"}');
    assert.throws(() => createStore({ file }), /повреждён/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
