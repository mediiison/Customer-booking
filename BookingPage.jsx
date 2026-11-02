import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import { buildDays } from '../lib/format.js';
import BookingForm from './BookingForm.jsx';
import Confirmation from './Confirmation.jsx';
import DayStrip from './DayStrip.jsx';
import NextWindow from './NextWindow.jsx';
import ServiceList from './ServiceList.jsx';
import SlotGrid from './SlotGrid.jsx';

export default function BookingPage({ config, services }) {
  const [service, setService] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [booked, setBooked] = useState(null);

  const days = useMemo(() => buildDays(config.today, config.horizonDays, config.hours), [config]);

  const nextFree = useApi(
    () => (service ? api.nextFree(service.id) : Promise.resolve(null)),
    [service?.id, booked],
  );
  const slots = useApi(
    () => (service && date ? api.slots(date, service.id) : Promise.resolve(null)),
    [service?.id, date],
  );

  // Если выбранное время пропало из свежего списка (его заняли), сбрасываем выбор.
  // Сверяем дату и услугу: на кадр после смены выбора в slots ещё лежит старый ответ.
  useEffect(() => {
    const fresh = slots.data;
    if (!time || !fresh || fresh.date !== date || fresh.serviceId !== service?.id) return;
    if (!fresh.slots.includes(time)) setTime(null);
  }, [slots.data, time, date, service?.id]);

  function pickService(next) {
    setService(next);
    setTime(null);
  }

  function pickDate(next) {
    setDate(next);
    setTime(null);
  }

  function pickNextFree(next) {
    setDate(next.date);
    setTime(next.time);
  }

  function reset() {
    setBooked(null);
    setService(null);
    setDate(null);
    setTime(null);
  }

  if (booked) {
    return <Confirmation booking={booked} studioName={config.studioName} onReset={reset} />;
  }

  return (
    <div className="layout">
      <div className="flow">
        <h1 className="title">Запись к мастеру</h1>
        <p className="lead">Выберите услугу, день и время. Свободные окна обновляются сразу после каждой записи.</p>

        <ServiceList services={services} value={service} onChange={pickService} />

        {service && (
          <NextWindow
            state={nextFree}
            today={config.today}
            horizonDays={config.horizonDays}
            selected={{ date, time }}
            onPick={pickNextFree}
          />
        )}

        <DayStrip days={days} value={date} onChange={pickDate} disabled={!service} />
        <SlotGrid hasService={Boolean(service)} date={date} state={slots} value={time} onChange={setTime} />
      </div>

      <BookingForm
        service={service}
        date={date}
        time={time}
        onBooked={setBooked}
        onSlotTaken={() => {
          setTime(null);
          slots.reload();
          nextFree.reload();
        }}
      />
    </div>
  );
}
