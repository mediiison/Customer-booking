import { formatDuration, formatPrice, groupByCategory } from '../lib/format.js';

export default function ServiceList({ services, value, onChange }) {
  return (
    <section aria-labelledby="h-service">
      <h2 id="h-service" className="section-title">Услуга</h2>
      <div role="radiogroup" aria-labelledby="h-service">
        {groupByCategory(services).map(([category, items]) => (
          <div className="service-group" key={category}>
            <h3 className="group-title">{category}</h3>
            {items.map((s) => (
              <label className="service" key={s.id}>
                <input
                  type="radio"
                  name="service"
                  value={s.id}
                  checked={value?.id === s.id}
                  onChange={() => onChange(s)}
                />
                <span className="service-body">
                  <span className="service-name">{s.name}</span>
                  <span className="service-meta">{formatDuration(s.durationMin)}</span>
                  <span className="service-price">{formatPrice(s.price)}</span>
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
