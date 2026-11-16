// Plik: Frontend/src/components/rooms/AlternativeStays.jsx
import { useState, useEffect } from 'react';
import { getAlternativeStays } from '../../api/reservationApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate, nightsLabel } from '../../utils/format';

// Gdy w wybranym terminie nie ma wolnego pokoju: najbliższe terminy tej samej długości (do 2 tygodni wcześniej lub później) z ceną.
// Kliknięcie propozycji wybiera ten termin (onSelectStay) - dalej sprawdzany jest tak samo jak każdy inny.
export default function AlternativeStays({ roomTypeId, checkIn, checkOut, onSelectStay }) {
  const [stays, setStays] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setStays(null);
        setStays(await getAlternativeStays(roomTypeId, checkIn, checkOut));
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [roomTypeId, checkIn, checkOut]);

  if (error) return <p className="text-sm text-danger-700">{error}</p>;
  if (stays === null) return <p className="text-sm text-slate-500">Szukamy najbliższych wolnych terminów...</p>;

  if (stays.length === 0) {
    return <p className="text-sm text-slate-600">W ciągu dwóch tygodni przed i po tym terminie nie ma wolnego pokoju na {nightsLabel(Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))}. Spróbuj krótszego pobytu albo innego miesiąca w kalendarzu.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Najbliższe wolne terminy tej samej długości:</div>
      <div className="flex flex-wrap gap-2">
        {stays.map(s => (
          <button key={s.checkInDate} type="button" onClick={() => onSelectStay(s.checkInDate.slice(0, 10), s.checkOutDate.slice(0, 10))}
            className="flex-1 basis-56 flex justify-between items-center gap-3 px-3.5 py-2.5 rounded-xl border border-navy-900 bg-white text-left text-sm hover:bg-sand-100 transition-colors">
            <span>
              <span className="font-semibold">{formatDate(s.checkInDate)} - {formatDate(s.checkOutDate)}</span>
              <span className="block text-xs text-slate-500">{s.availableRooms === 1 ? 'ostatni wolny pokój' : `wolne pokoje: ${s.availableRooms}`}</span>
            </span>
            <span className="font-semibold whitespace-nowrap">{s.totalPrice} zł</span>
          </button>
        ))}
      </div>
    </div>
  );
}