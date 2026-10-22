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
  'pending': 'bg-amber-300 hover:bg-amber-400 text-amber-900',
  'confirmed': 'bg-sky-500 hover:bg-sky-600 text-white',
  'completed': 'bg-sky-300 hover:bg-sky-400 text-sky-900',
  'no-show': 'bg-slate-400 hover:bg-slate-500 text-white'
};

const legend = [
  { label: 'Wolny', style: 'bg-emerald-100' },
  { label: 'Rezerwacja oczekująca', style: 'bg-amber-300' },
  { label: 'Rezerwacja potwierdzona', style: 'bg-sky-500' },
  { label: 'Rezerwacja zrealizowana', style: 'bg-sky-300' },
  { label: 'Niestawienie się', style: 'bg-slate-400' },
  { label: 'Blokada (remont, konserwacja)', style: 'bg-red-300' },
  { label: 'Pokój wyłączony z rezerwacji', style: 'bg-slate-200' }
];

const cellBase = 'block w-full h-9 rounded';

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

  // Komórka jednej nocy: rezerwację i blokadę można kliknąć, opis jest w podpowiedzi po najechaniu
  const renderNight = (room, day, index) => {
    const date = formatDate(day.date);

    if (day.status === 'booked') {
      // Numer rezerwacji w pierwszej widocznej nocy pobytu
      const isFirstNight = index === 0 || room.days[index - 1].reservationId !== day.reservationId;
      const title = `${date} · rezerwacja #${day.reservationId} (${reservationStatusLabels[day.reservationStatus] ?? day.reservationStatus}) · ${day.guestName}`;
      return (
        <button type="button" title={title} aria-label={title} onClick={() => onNavigate(`/panel/rezerwacje/${day.reservationId}`)}
          className={`${cellBase} text-[10px] font-bold ${bookedStyles[day.reservationStatus] ?? 'bg-sky-500 text-white'}`}>
          {isFirstNight ? `#${day.reservationId}` : ''}
        </button>
      );
    }

    if (day.status === 'blocked') {
      const title = `${date} · blokada: ${day.blockReason}`;
      return <button type="button" title={title} aria-label={title} onClick={() => onNavigate('/panel/blokady')} className={`${cellBase} bg-red-300 hover:bg-red-400`} />;
    }

    const isBookable = room.roomStatus === 'available';
    const title = `${date} · ${isBookable ? 'wolny' : `pokój niedostępny (${roomStatusLabels[room.roomStatus] ?? room.roomStatus})`}`;
    return <div title={title} className={`${cellBase} ${isBookable ? 'bg-emerald-100' : 'bg-slate-200'}`} />;
  };

  return (
    <>
      {error && <Alert type="error" message={error} />}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Od</label>
            <input type="date" value={from} onChange={e => { if (e.target.value) setFrom(e.target.value); }} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Okres</label>
            <select value={nights} onChange={e => setNights(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
              {periodOptions.map(n => <option key={n} value={n}>{nightsLabel(n)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Typ pokoju</label>
            <select value={roomTypeFilter} onChange={e => setRoomTypeFilter(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
              <option value="">Wszystkie</option>
              {roomTypeNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFrom(addDaysToInputDate(from, -nights))} aria-label="Poprzedni okres" className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">‹</button>
            <button type="button" onClick={() => setFrom(today)} className="flex-1 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Dziś</button>
            <button type="button" onClick={() => setFrom(addDaysToInputDate(from, nights))} aria-label="Następny okres" className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">›</button>
          </div>
        </div>

        {/* --- PODSUMOWANIE OKRESU --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border">
            <div className="text-xs font-semibold text-slate-500 uppercase">Obłożenie w okresie</div>
            <div className="text-2xl font-bold text-slate-800">{occupancy}%</div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-xs font-semibold text-slate-500 uppercase">Wolne pokoje {formatDate(from)}</div>
            <div className="text-2xl font-bold text-slate-800">{freeRoomsOn(0)} <span className="text-base font-medium text-slate-500">z {rooms.length}</span></div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-xs font-semibold text-slate-500 uppercase">Noce zarezerwowane</div>
            <div className="text-2xl font-bold text-slate-800">{bookedNights}</div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-xs font-semibold text-slate-500 uppercase">Noce zablokowane</div>
            <div className="text-2xl font-bold text-slate-800">{blockedNights}</div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            {formatDate(from)} - {formatDate(addDaysToInputDate(from, nights - 1))} ({nightsLabel(nights)}). Każda kolumna to jedna noc - dzień wymeldowania jest już wolny dla kolejnego gościa.
            Kliknij rezerwację, aby otworzyć jej szczegóły, albo blokadę, aby przejść do zakładki Blokady.
          </p>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b">
                  <th className="sticky left-0 z-10 bg-slate-100 p-3 text-left font-semibold min-w-36">Pokój</th>
                  {dates.map(d => (
                    <th key={d} className={`px-1 py-2 text-center min-w-9 ${isWeekend(d) ? 'bg-slate-200' : ''} ${d === today ? 'text-emerald-700' : ''}`}>
                      <div className="text-[10px] font-medium uppercase">{weekdayLabel(d)}</div>
                      <div className="font-bold">{Number(d.slice(8, 10))}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.roomId} className="border-b">
                    <th className="sticky left-0 z-10 bg-white p-3 text-left font-normal">
                      <div className="font-bold text-slate-800">{room.roomNumber}</div>
                      <div className="text-xs text-slate-500">{room.roomTypeName}</div>
                      {room.roomStatus !== 'available' && (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${roomStatusStyles[room.roomStatus] ?? 'bg-slate-100 text-slate-600'}`}>{roomStatusLabels[room.roomStatus] ?? room.roomStatus}</span>
                      )}
                    </th>
                    {room.days.map((day, i) => <td key={day.date} className="p-0.5">{renderNight(room, day, i)}</td>)}
                  </tr>
                ))}
                {rooms.length > 0 && (
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="sticky left-0 z-10 bg-slate-50 p-3 text-left text-xs font-semibold uppercase">Wolne pokoje</th>
                    {dates.map((d, i) => <td key={d} className="py-2 text-center font-bold">{freeRoomsOn(i)}</td>)}
                  </tr>
                )}
                {rooms.length === 0 && <tr><td className="p-4 text-center text-slate-500">Brak pokoi. Dodaj pokoje w zakładce Fizyczne Pokoje.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          {legend.map(item => (
            <span key={item.label} className="flex items-center gap-2"><span className={`w-4 h-4 rounded ${item.style}`} />{item.label}</span>
          ))}
        </div>
      </div>
    </>
  );
}