import { formatDayNumber, formatMonthShort, formatWeekdayShort } from '../lib/format.js';

export default function DayStrip({ days, value, onChange, disabled }) {
  return (
    <section aria-labelledby="h-date">
      <h2 id="h-date" className="section-title">Дата</h2>
      <div className="days" role="radiogroup" aria-labelledby="h-date" aria-disabled={disabled}>
        {days.map(({ date, closed }) => (
          <label className={`day${closed ? ' is-closed' : ''}`} key={date}>
            <input
              type="radio"
              name="date"
              value={date}
              checked={value === date}
              disabled={disabled || closed}
              onChange={() => onChange(date)}
            />
            <span className="day-body">
              <span className="day-week">{formatWeekdayShort(date)}</span>
              <span className="day-num">{formatDayNumber(date)}</span>
              <span className="day-month">{closed ? 'выходной' : formatMonthShort(date)}</span>
            </span>
          </label>
        ))}
      </div>
      {disabled && <p className="hint">Сначала выберите услугу.</p>}
    </section>
  );
}
