import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import { formatPhone, formatPrice, pluralRu } from '../lib/format.js';

const STORAGE_KEY = 'masterToken';

// sessionStorage может быть недоступен (приватный режим, запрет сайту), поэтому без него тоже работаем.
function readToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeToken(token) {
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // токен останется только в памяти страницы
  }
}

export default function AdminPanel({ config }) {
  const [token, setToken] = useState(readToken);
  const [input, setInput] = useState('');
  const [date, setDate] = useState(config.today);
  const [message, setMessage] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const list = useApi(
    () => (token ? api.listBookings(date, token) : Promise.resolve(null)),
    [token, date],
  );

  useEffect(() => {
    if (list.error?.status === 401) {
      writeToken('');
      setToken('');
      setMessage('Токен не подошёл. Проверьте его и попробуйте снова.');
    }
  }, [list.error]);

  function login(e) {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    writeToken(value);
    setToken(value);
    setInput('');
    setMessage(null);
  }

  function logout() {
    writeToken('');
    setToken('');
  }

  async function cancel(booking) {
    const ok = window.confirm(`Отменить запись: ${booking.clientName}, ${booking.start}?`);
    if (!ok) return;
    setBusyId(booking.id);
    setMessage(null);
    try {
      await api.cancelBooking(booking.id, token);
      list.reload();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!token) {
    return (
      <div className="admin">
        <h1 className="title">Расписание мастера</h1>
        <form className="summary admin-login" onSubmit={login}>
          <div className="field">
            <label htmlFor="token">Токен мастера</label>
            <input
              id="token"
              type="password"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <p className="hint">Сервер печатает токен в консоль при запуске. Свой можно задать переменной ADMIN_TOKEN.</p>
          </div>
          {message && <p className="error" role="alert">{message}</p>}
          <button type="submit" className="btn btn-block" disabled={!input.trim()}>Войти</button>
        </form>
      </div>
    );
  }

  const bookings = list.data ?? [];
  const total = bookings.reduce((sum, b) => sum + b.price, 0);

  return (
    <div className="admin">
      <h1 className="title">Расписание мастера</h1>

      <div className="admin-bar">
        <div className="field">
          <label htmlFor="admin-date">День</label>
          <input id="admin-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <button type="button" className="btn btn-quiet" onClick={logout}>Выйти</button>
      </div>

      {message && <p className="error" role="alert">{message}</p>}

      {list.loading && <p className="hint" aria-live="polite">Загружаю записи</p>}
      {list.error && list.error.status !== 401 && (
        <div role="alert">
          <p className="error">{list.error.message}</p>
          <button type="button" className="btn btn-quiet" onClick={list.reload}>Повторить</button>
        </div>
      )}

      {list.data && bookings.length === 0 && <p className="hint">На этот день записей нет.</p>}

      {bookings.length > 0 && (
        <>
          <p className="admin-total">
            {bookings.length} {pluralRu(bookings.length, ['запись', 'записи', 'записей'])} на {formatPrice(total)}
          </p>
          <ul className="booking-list">
            {bookings.map((b) => (
              <li className="booking-row" key={b.id}>
                <p className="booking-time">{b.start} - {b.end}</p>
                <div className="booking-info">
                  <p className="booking-service">{b.serviceName}</p>
                  <p className="booking-client">
                    {b.clientName}, <a href={`tel:${b.phone}`}>{formatPhone(b.phone)}</a>
                  </p>
                  {b.comment && <p className="booking-comment">{b.comment}</p>}
                </div>
                <button
                  type="button"
                  className="btn btn-quiet"
                  disabled={busyId === b.id}
                  onClick={() => cancel(b)}
                >
                  Отменить
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
