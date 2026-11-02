export default function SlotGrid({ hasService, date, state, value, onChange }) {
  const { data, error, loading, reload } = state;

  let content;
  if (!hasService || !date) {
    content = <p className="hint">{hasService ? 'Выберите дату, и здесь появится свободное время.' : 'Сначала выберите услугу и дату.'}</p>;
  } else if (loading) {
    content = <p className="hint" aria-live="polite">Ищу свободное время</p>;
  } else if (error) {
    content = (
      <div role="alert">
        <p className="hint">{error.message}</p>
        <button type="button" className="btn btn-quiet" onClick={reload}>Повторить</button>
      </div>
    );
  } else if (data.closed) {
    content = <p className="hint">В этот день студия не работает. Выберите другую дату.</p>;
  } else if (data.slots.length === 0) {
    content = <p className="hint">На этот день всё занято. Выберите другую дату.</p>;
  } else {
    content = (
      <div className="slots" role="radiogroup" aria-labelledby="h-time">
        {data.slots.map((time) => (
          <label className="slot" key={time}>
            <input
              type="radio"
              name="time"
              value={time}
              checked={value === time}
              onChange={() => onChange(time)}
            />
            <span className="slot-body">{time}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="h-time">
      <h2 id="h-time" className="section-title">Время</h2>
      {content}
    </section>
  );
}
