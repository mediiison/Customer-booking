import { useState } from 'react';
import { api } from './api.js';
import { useApi } from './hooks.js';
import AdminPanel from './components/AdminPanel.jsx';
import BookingPage from './components/BookingPage.jsx';

const TABS = [
  { id: 'book', label: 'Записаться' },
  { id: 'admin', label: 'Расписание мастера' },
];

export default function App() {
  const [tab, setTab] = useState('book');
  const boot = useApi(async () => {
    const [config, services] = await Promise.all([api.config(), api.services()]);
    return { config, services };
  }, []);

  const studioName = boot.data?.config.studioName ?? 'Запись к мастеру';

  return (
    <>
      <header className="top">
        <span className="brand">{studioName}</span>
        <nav className="tabs" aria-label="Разделы">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tab"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {boot.loading && <p className="hint" aria-live="polite">Загружаю</p>}

        {boot.error && (
          <div role="alert">
            <p className="error">{boot.error.message}</p>
            <button type="button" className="btn btn-quiet" onClick={boot.reload}>Повторить</button>
          </div>
        )}

        {boot.data && (
          <>
            <div hidden={tab !== 'book'}>
              <BookingPage config={boot.data.config} services={boot.data.services} />
            </div>
            <div hidden={tab !== 'admin'}>
              <AdminPanel config={boot.data.config} />
            </div>
          </>
        )}
      </main>
    </>
  );
}
