import { useState } from 'react';
import { api } from '../api.js';
import { formatDateLong, formatDuration, formatPrice } from '../lib/format.js';

const FIELDS = ['clientName', 'phone', 'comment'];

export default function BookingForm({ service, date, time, onBooked, onSlotTaken }) {
  const [values, setValues] = useState({ clientName: '', phone: '', comment: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const ready = Boolean(service && date && time);
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!ready || submitting) return;
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await api.createBooking({ serviceId: service.id, date, time, ...values });
      onBooked(result);
    } catch (err) {
      if (FIELDS.includes(err.field)) setErrors({ [err.field]: err.message });
      else setFormError(err.message);
      if (err.code === 'SLOT_TAKEN') onSlotTaken();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="summary" onSubmit={submit} noValidate>
      <h2 className="section-title">Ваша запись</h2>

      {ready ? (
        <dl className="facts">
          <dt>Услуга</dt>
          <dd>{service.name}</dd>
          <dt>Когда</dt>
          <dd>{formatDateLong(date)}, {time}</dd>
          <dt>Длительность</dt>
          <dd>{formatDuration(service.durationMin)}</dd>
          <dt>Стоимость</dt>
          <dd>{formatPrice(service.price)}</dd>
        </dl>
      ) : (
        <p className="hint">Выберите услугу, дату и время, и здесь появятся детали записи.</p>
      )}

      <div className="field">
        <label htmlFor="clientName">Имя</label>
        <input
          id="clientName"
          autoComplete="name"
          value={values.clientName}
          onChange={set('clientName')}
          aria-invalid={Boolean(errors.clientName)}
          aria-describedby={errors.clientName ? 'err-clientName' : undefined}
        />
        {errors.clientName && <p id="err-clientName" className="error">{errors.clientName}</p>}
      </div>

      <div className="field">
        <label htmlFor="phone">Телефон</label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 900 000-00-00"
          value={values.phone}
          onChange={set('phone')}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'err-phone' : undefined}
        />
        {errors.phone && <p id="err-phone" className="error">{errors.phone}</p>}
      </div>

      <div className="field">
        <label htmlFor="comment">Комментарий для мастера</label>
        <textarea
          id="comment"
          rows={3}
          value={values.comment}
          onChange={set('comment')}
          aria-invalid={Boolean(errors.comment)}
          aria-describedby={errors.comment ? 'err-comment' : undefined}
        />
        {errors.comment && <p id="err-comment" className="error">{errors.comment}</p>}
      </div>

      {formError && <p className="error" role="alert">{formError}</p>}

      <button type="submit" className="btn btn-block" disabled={!ready || submitting}>
        {submitting ? 'Записываю' : 'Записаться'}
      </button>
    </form>
  );
}
