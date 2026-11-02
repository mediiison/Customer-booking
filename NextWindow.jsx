import { describeDay } from '../lib/format.js';

export default function NextWindow({ state, today, horizonDays, selected, onPick }) {
  const { data, error, loading, reload } = state;

  if (loading) {
    return (
      <div className="next" aria-live="polite">
        <p className="next-note">Ищу ближайшее свободное время</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="next" role="alert">
        <p className="next-note">{error.message}</p>
        <button type="button" className="btn btn-quiet" onClick={reload}>Повторить</button>
      </div>
    );
  }

  const next = data?.next;
  if (!next) {
    return (
      <div className="next">
        <p className="next-note">
          На ближайшие {horizonDays} дней свободного времени для этой услуги нет.
        </p>
      </div>
    );
  }

  const isSelected = selected.date === next.date && selected.time === next.time;

  return (
    <div className="next">
      <p className="next-note">Ближайшее свободное время для этой услуги</p>
      <p className="next-when">{describeDay(next.date, today)}, {next.time}</p>
      <button
        type="button"
        className="btn btn-quiet"
        disabled={isSelected}
        onClick={() => onPick(next)}
      >
        {isSelected ? 'Это время выбрано' : 'Выбрать это время'}
      </button>
    </div>
  );
}
