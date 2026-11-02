import { formatDateLong, formatPrice } from '../lib/format.js';

export default function Confirmation({ booking, studioName, onReset }) {
  return (
    <section className="done" aria-labelledby="h-done">
      <h1 id="h-done" className="done-title">Вы записаны</h1>
      <p className="done-lead">{studioName} ждёт вас.</p>
      <dl className="facts">
        <dt>Услуга</dt>
        <dd>{booking.serviceName}</dd>
        <dt>Когда</dt>
        <dd>{formatDateLong(booking.date)}</dd>
        <dt>Время</dt>
        <dd>{booking.start} - {booking.end}</dd>
        <dt>Стоимость</dt>
        <dd>{formatPrice(booking.price)}</dd>
        <dt>Номер записи</dt>
        <dd>{booking.id.slice(0, 8)}</dd>
      </dl>
      <button type="button" className="btn" onClick={onReset}>Записаться ещё</button>
    </section>
  );
}
