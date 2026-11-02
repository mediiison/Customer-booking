import { useCallback, useEffect, useState } from 'react';

/**
 * Загружает данные и перезагружает их при смене deps.
 * Возвращает { data, error, loading, reload }.
 *
 * Результат привязан к ключу из deps: пока ключ изменился, а новый ответ ещё не пришёл,
 * хук честно отдаёт loading: true и не показывает данные от прошлых параметров.
 */
export function useApi(load, deps) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: null });
  const key = JSON.stringify([...deps, tick]);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setState({ key, data, error: null });
      },
      (error) => {
        if (!cancelled) setState({ key, data: null, error });
      },
    );
    return () => {
      cancelled = true;
    };
    // load намеренно не в зависимостях: перезагрузкой управляет key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const current = state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current,
    reload,
  };
}
