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
    if (day < today) return 'text-slate-400 cursor-not-allowed';
    if (rangeStart && day === rangeStart) return 'bg-navy-900 text-white';
    if (rangeStart && rangeEnd && day > rangeStart && day < rangeEnd) return 'bg-navy-900 text-white';
    if (rangeEnd && day === rangeEnd) return 'bg-white text-navy-900 ring-2 ring-inset ring-navy-900';
    if (free === undefined) return 'bg-sand-50 text-slate-400';
    if (free === 0) return 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-300';
    return 'bg-success-50 text-navy-900 hover:ring-2 hover:ring-inset hover:ring-navy-900';
  };

  // Podpis pod numerem dnia: przyjazd / wyjazd wybranego pobytu albo liczba wolnych pokoi
  const dayNote = (day) => {
    if (rangeStart && day === rangeStart) return 'przyjazd';
    if (rangeEnd && day === rangeEnd) return 'wyjazd';
    if (day < today || nights[day] === undefined) return '';
    return nights[day] === 0 ? 'zajęte' : `wolne: ${nights[day]}`;
  };

  const dayTitle = (day) => {
    const free = nights[day];
    if (day < today || free === undefined) return formatDate(day);
    return `${formatDate(day)} · ${free === 0 ? 'brak wolnych pokoi' : `wolne pokoje: ${free}`}`;
  };

  const monthButton = 'w-11 h-11 rounded-full border border-slate-300 bg-white text-xl text-navy-900 hover:border-navy-900 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-300';

  return (
    <div className="card p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setMonth(addMonths(month, -1))} disabled={month <= firstDayOfMonth(today)} aria-label="Poprzedni miesiąc" className={monthButton}>‹</button>
        <div className="font-display text-xl md:text-[1.375rem]">{monthLabel(month)}</div>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= addMonths(firstDayOfMonth(today), 11)} aria-label="Następny miesiąc" className={monthButton}>›</button>
      </div>

      {error && <p className="text-sm text-danger-700">{error}</p>}

      <div className="grid grid-cols-7 gap-1 md:gap-1.5 text-center">
        {weekdays.map(w => <div key={w} className="pb-1 text-xs font-semibold uppercase text-slate-500">{w}</div>)}
        {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
        {days.map(day => (
          <button key={day} type="button" disabled={day < today} onClick={() => handleDayClick(day)} title={dayTitle(day)} aria-label={dayTitle(day)}
            className={`min-h-13 rounded-[10px] flex flex-col items-center justify-center gap-0.5 leading-tight transition-shadow ${dayStyle(day)}`}>
            <span className="text-[15px] font-semibold">{Number(day.slice(8, 10))}</span>
            <span className="text-[10px] md:text-[11px] opacity-90">{dayNote(day)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-success-50" aria-hidden="true" />wolny pokój</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-slate-100 ring-1 ring-inset ring-slate-300" aria-hidden="true" />brak wolnych pokoi</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-navy-900" aria-hidden="true" />wybrany pobyt</span>
      </div>

      <p className="text-sm text-slate-600">
        {message || 'Liczba pod datą to wolne pokoje tego typu w tę noc.'}
      </p>
    </div>
  );
}
