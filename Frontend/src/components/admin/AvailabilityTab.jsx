// Plik: Frontend/src/components/admin/AvailabilityTab.jsx
import { useState, useEffect } from 'react';
import { roomStatusLabels, roomStatusStyles, reservationStatusLabels } from '../../utils/statuses';
import { getAvailabilityCalendar } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate, toInputDate, addDaysToInputDate, nightsLabel } from '../../utils/format';
import Alert from '../common/Alert';

// Długość wyświetlanego okresu (liczba nocy)
const periodOptions = [7, 14, 30];

// Kolory zarezerwowanych nocy - według statusu rezerwacji
const bookedStyles = {
  'pending': 'bg-warning-100 hover:brightness-95 text-warning-700',
  'confirmed': 'bg-navy-900 hover:bg-navy-800 text-white',
  'completed': 'bg-success-50 hover:brightness-95 text-success-700'
};

const legend = [
  { label: 'wolna noc', style: 'bg-white ring-1 ring-inset ring-slate-300' },
  { label: 'oczekująca (nieopłacona)', style: 'bg-warning-100' },
  { label: 'potwierdzona', style: 'bg-navy-900' },
  { label: 'zrealizowana', style: 'bg-success-50 ring-1 ring-inset ring-success-200' },
  { label: 'blokada (remont, konserwacja)', style: 'stripes' },
  { label: 'pokój wyłączony z rezerwacji', style: 'bg-slate-100' }
];

const cellBase = 'block h-10 my-1';

const weekdayLabel = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('pl-PL', { weekday: 'short' });
const isWeekend = (value) => [0, 6].includes(new Date(`${value}T00:00:00`).getDay());

// Zakładka "Dostępność": kalendarz pokoje × noce - wolne, zarezerwowane i zablokowane noce oraz obłożenie hotelu
export default function AvailabilityTab({ token, onNavigate }) {
  const today = toInputDate(new Date());
  const [from, setFrom] = useState(today);
  const [nights, setNights] = useState(14);
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [calendar, setCalendar] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setCalendar(await getAvailabilityCalendar(from, addDaysToInputDate(from, nights), token));
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, from, nights]);

  const roomTypeNames = [...new Set(calendar.map(r => r.roomTypeName))];
  const rooms = calendar.filter(r => !roomTypeFilter || r.roomTypeName === roomTypeFilter);
  const dates = calendar.length > 0 ? calendar[0].days.map(d => d.date.slice(0, 10)) : [];

  // Noc można sprzedać, gdy jest wolna, a pokój ma status "available" - tak samo liczy moduł dostępności w API
  const isForSale = (room, day) => day.status === 'free' && room.roomStatus === 'available';
  const allNights = rooms.flatMap(room => room.days.map(day => ({ room, day })));
  const bookedNights = allNights.filter(n => n.day.status === 'booked').length;
  const blockedNights = allNights.filter(n => n.day.status === 'blocked').length;
  const freeNights = allNights.filter(n => isForSale(n.room, n.day)).length;
  // Obłożenie = noce zarezerwowane / noce, które dało się sprzedać (zarezerwowane + wolne, bez blokad i wyłączonych pokoi)
  const occupancy = bookedNights + freeNights > 0 ? Math.round(bookedNights * 100 / (bookedNights + freeNights)) : 0;
  const freeRoomsOn = (index) => rooms.filter(room => room.days[index] && isForSale(room, room.days[index])).length;

  // Komórka jednej nocy: rezerwację i blokadę można kliknąć, opis jest w podpowiedzi po najechaniu.
  // Kolejne noce tej samej rezerwacji / blokady łączą się w jeden pasek (zaokrąglony tylko na końcach)
  const renderNight = (room, day, index) => {
    const date = formatDate(day.date);
    const previous = room.days[index - 1];
    const next = room.days[index + 1];
    const sameAs = (other) => other && other.status === day.status && other.reservationId === day.reservationId;
    const startsHere = !sameAs(previous), endsHere = !sameAs(next);
    const width = startsHere && endsHere ? 'w-[calc(100%-0.25rem)]' : startsHere || endsHere ? 'w-[calc(100%-0.125rem)]' : 'w-full';
    const ends = `${width} ${startsHere ? 'ml-0.5 rounded-l-lg' : ''} ${endsHere ? 'mr-0.5 rounded-r-lg' : ''}`;

    if (day.status === 'booked') {
      // Numer rezerwacji w pierwszej widocznej nocy pobytu (startsHere)
      const title = `${date} · rezerwacja #${day.reservationId} (${reservationStatusLabels[day.reservationStatus] ?? day.reservationStatus}) · ${day.guestName}`;
      return (
        <button type="button" title={title} aria-label={title} onClick={() => onNavigate(`/panel/rezerwacje/${day.reservationId}`)}
          className={`${cellBase} ${ends} px-1.5 text-left text-[11px] font-bold whitespace-nowrap overflow-hidden ${bookedStyles[day.reservationStatus] ?? bookedStyles.confirmed}`}>
          {startsHere ? `#${day.reservationId}` : ''}
        </button>
      );
    }

    if (day.status === 'blocked') {
      const title = `${date} · blokada: ${day.blockReason}`;
      return <button type="button" title={title} aria-label={title} onClick={() => onNavigate('/panel/blokady')} className={`${cellBase} ${ends} stripes hover:brightness-95`} />;
    }

    const isBookable = room.roomStatus === 'available';
    const title = `${date} · ${isBookable ? 'wolny' : `pokój niedostępny (${roomStatusLabels[room.roomStatus] ?? room.roomStatus})`}`;
    return <div title={title} className={`${cellBase} mx-0.5 rounded-lg ${isBookable ? '' : 'bg-slate-100'}`} />;
  };

  const navButton = 'w-11 h-11 rounded-[10px] border border-slate-300 bg-white text-lg hover:border-navy-900';
  const statCard = 'card p-4 md:p-5';
  const statLabel = 'text-[13px] font-semibold text-slate-500';
  const statValue = 'mt-1.5 font-display text-3xl font-semibold';

  return (
    <>
      {error && <Alert type="error" message={error} />}

      <div className="space-y-5">
        {/* --- OKRES I FILTR --- */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="field-label">Od
              <input type="date" value={from} onChange={e => { if (e.target.value) setFrom(e.target.value); }} className="field py-2.5 font-normal" />
            </label>
            <label className="field-label">Okres
              <select value={nights} onChange={e => setNights(Number(e.target.value))} className="field py-2.5 font-normal">
                {periodOptions.map(n => <option key={n} value={n}>{nightsLabel(n)}</option>)}
              </select>
            </label>
            <label className="field-label">Typ pokoju
              <select value={roomTypeFilter} onChange={e => setRoomTypeFilter(e.target.value)} className="field py-2.5 font-normal">
                <option value="">Wszystkie</option>
                {roomTypeNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFrom(addDaysToInputDate(from, -nights))} aria-label="Poprzedni okres" className={navButton}>‹</button>
            <button type="button" onClick={() => setFrom(today)} className="h-11 px-5 rounded-[10px] bg-navy-900 text-white font-semibold hover:bg-navy-800">Dziś</button>
            <button type="button" onClick={() => setFrom(addDaysToInputDate(from, nights))} aria-label="Następny okres" className={navButton}>›</button>
          </div>
        </div>

        {/* --- PODSUMOWANIE OKRESU (liczone z siatki poniżej) --- */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
          <div className={statCard}><div className={statLabel}>Obłożenie w okresie</div><div className={statValue}>{occupancy}%</div></div>
          <div className={statCard}><div className={statLabel}>Noce zarezerwowane</div><div className={statValue}>{bookedNights}</div></div>
          <div className={statCard}><div className={statLabel}>Noce wolne do sprzedaży</div><div className={statValue}>{freeNights}</div></div>
          <div className={statCard}><div className={statLabel}>Noce zablokowane</div><div className={statValue}>{blockedNights}</div></div>
        </div>

        <p className="text-sm text-slate-500">
          {formatDate(from)} - {formatDate(addDaysToInputDate(from, nights - 1))} ({nightsLabel(nights)}). Każda kolumna to jedna noc - dzień wymeldowania jest już wolny dla kolejnego gościa.
          Kliknij rezerwację, aby otworzyć jej szczegóły, albo blokadę, aby przejść do blokad.
        </p>

        {/* --- SIATKA POKOJE × NOCE --- */}
        <div className="overflow-x-auto card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-sand-300">
                <th className="sticky left-0 z-10 bg-white px-3.5 py-3 text-left text-xs font-bold uppercase tracking-[0.06em] text-slate-500 min-w-36">Pokój</th>
                {dates.map(d => (
                  <th key={d} className={`px-0.5 py-2 text-center min-w-11 ${d === today ? 'bg-navy-900 text-white rounded-t-lg' : isWeekend(d) ? 'text-brass-700' : ''}`}>
                    <div className="text-[11px] font-medium uppercase">{weekdayLabel(d)}</div>
                    <div className="text-[15px] font-semibold">{Number(d.slice(8, 10))}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room.roomId} className="border-b border-sand-200">
                  <th className="sticky left-0 z-10 bg-white px-3.5 py-2 text-left font-normal">
                    <div className="font-bold">{room.roomNumber}</div>
                    <div className="text-xs text-slate-500">{room.roomTypeName}</div>
                    {room.roomStatus !== 'available' && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${roomStatusStyles[room.roomStatus] ?? 'bg-slate-100 text-slate-600'}`}>{roomStatusLabels[room.roomStatus] ?? room.roomStatus}</span>
                    )}
                  </th>
                  {room.days.map((day, i) => <td key={day.date} className="p-0">{renderNight(room, day, i)}</td>)}
                </tr>
              ))}
              {rooms.length > 0 && (
                <tr className="bg-sand-50 text-slate-600">
                  <th className="sticky left-0 z-10 bg-sand-50 px-3.5 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em]">Wolne pokoje</th>
                  {dates.map((d, i) => <td key={d} className="py-2 text-center font-bold">{freeRoomsOn(i)}</td>)}
                </tr>
              )}
              {rooms.length === 0 && <tr><td className="p-4 text-center text-slate-500">Brak pokoi. Dodaj pokoje w zakładce Pokoje.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-500">
          {legend.map(item => (
            <span key={item.label} className="flex items-center gap-2"><span className={`w-4 h-4 rounded ${item.style}`} aria-hidden="true" />{item.label}</span>
          ))}
        </div>
      </div>
    </>
  );
}
