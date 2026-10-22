// Plik: Frontend/src/components/rooms/RoomAvailabilityCalendar.jsx
import { useState, useEffect } from 'react';
import { getRoomTypeAvailability } from '../../api/roomApi';
import { errorMessage } from '../../api/apiErrors';
import { toInputDate, addDaysToInputDate, formatDate } from '../../utils/format';

const weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

// Miesiące zapisane jako data pierwszego dnia, np. '2027-03-01'
const firstDayOfMonth = (value) => `${value.slice(0, 7)}-01`;
const addMonths = (month, count) => { const d = new Date(`${month}T00:00:00`); d.setMonth(d.getMonth() + count); return toInputDate(d); };
const monthLabel = (month) => new Date(`${month}T00:00:00`).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

// Kalendarz dostępności typu pokoju dla gościa: wolne noce w miesiącu i wybór terminu (dzień przyjazdu, potem dzień wyjazdu).
// Liczba w dniu = wolne pokoje tego typu w tę noc. Wybrany termin jest potem sprawdzany tak jak w wyszukiwarce.
export default function RoomAvailabilityCalendar({ roomTypeId, checkIn, checkOut, onSelectStay }) {
  const today = toInputDate(new Date());
  const [month, setMonth] = useState(firstDayOfMonth(checkIn && checkIn >= today ? checkIn : today));
  const [nights, setNights] = useState({});
  const [pickedCheckIn, setPickedCheckIn] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getRoomTypeAvailability(roomTypeId, month, addMonths(month, 1));
        // Noce z kolejnych miesięcy są dopisywane - wybór terminu może przechodzić przez granicę miesiąca
        setNights(prev => ({ ...prev, ...Object.fromEntries(data.map(n => [n.date.slice(0, 10), n.availableRooms])) }));
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [roomTypeId, month]);

  // Dni miesiąca poprzedzone pustymi polami, żeby pierwszy dzień trafił pod właściwy dzień tygodnia (tydzień od poniedziałku)
  const leadingBlanks = (new Date(`${month}T00:00:00`).getDay() + 6) % 7;
  const days = [];
  for (let day = month; day < addMonths(month, 1); day = addDaysToInputDate(day, 1)) days.push(day);

  const handleDayClick = (day) => {
    // Pierwsze kliknięcie (albo dzień nie późniejszy niż przyjazd) - dzień przyjazdu; noc musi być wolna
    if (!pickedCheckIn || day <= pickedCheckIn) {
      if (nights[day] === 0) { setMessage('W tę noc nie ma wolnych pokoi - wybierz inny dzień przyjazdu.'); return; }
      setPickedCheckIn(day);
      setMessage('Wybierz dzień wyjazdu.');
      return;
    }

    // Drugie kliknięcie - dzień wyjazdu; każda noc od przyjazdu do dnia przed wyjazdem musi mieć wolny pokój
    for (let night = pickedCheckIn; night < day; night = addDaysToInputDate(night, 1)) {
      if (nights[night] === 0) {
        setMessage(`Noc ${formatDate(night)} nie ma wolnych pokoi - wybierz krótszy pobyt albo inny termin.`);
        setPickedCheckIn(null);
        return;
      }
    }
    setPickedCheckIn(null);
    setMessage('');
    onSelectStay(pickedCheckIn, day);
  };

  // Zaznaczenie: noce wybranego pobytu i dzień wyjazdu (w trakcie wybierania - sam dzień przyjazdu)
  const rangeStart = pickedCheckIn ?? checkIn;
  const rangeEnd = pickedCheckIn ? null : checkOut;

  const dayStyle = (day) => {
    const free = nights[day];
    if (day < today) return 'text-slate-300 cursor-not-allowed';
    if (rangeStart && day === rangeStart) return 'bg-emerald-600 text-white';
    if (rangeStart && rangeEnd && day > rangeStart && day < rangeEnd) return 'bg-emerald-500 text-white';
    if (rangeEnd && day === rangeEnd) return 'ring-2 ring-emerald-600 bg-white text-slate-800';
    if (free === undefined) return 'bg-slate-50 text-slate-400';
    if (free === 0) return 'bg-red-50 text-red-300 hover:bg-red-100';
    return 'bg-emerald-50 text-slate-800 hover:bg-emerald-100';
  };

  const dayTitle = (day) => {
    const free = nights[day];
    if (day < today || free === undefined) return formatDate(day);
    return `${formatDate(day)} · ${free === 0 ? 'brak wolnych pokoi' : `wolne pokoje: ${free}`}`;
  };

  return (
    <div className="p-3 rounded-lg border border-slate-200 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setMonth(addMonths(month, -1))} disabled={month <= firstDayOfMonth(today)} aria-label="Poprzedni miesiąc"
          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
        <div className="font-semibold text-slate-800 capitalize">{monthLabel(month)}</div>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= addMonths(firstDayOfMonth(today), 11)} aria-label="Następny miesiąc"
          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map(w => <div key={w} className="text-[10px] font-semibold uppercase text-slate-500">{w}</div>)}
        {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
        {days.map(day => (
          <button key={day} type="button" disabled={day < today} onClick={() => handleDayClick(day)} title={dayTitle(day)} aria-label={dayTitle(day)}
            className={`h-11 rounded-md text-sm leading-tight ${dayStyle(day)}`}>
            <div className="font-semibold">{Number(day.slice(8, 10))}</div>
            {day >= today && nights[day] !== undefined && <div className="text-[10px] opacity-80">{nights[day] === 0 ? '—' : nights[day]}</div>}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        {message || 'Kliknij dzień przyjazdu, a potem dzień wyjazdu. Liczba pod datą to wolne pokoje tego typu w tę noc.'}
      </p>
    </div>
  );
}