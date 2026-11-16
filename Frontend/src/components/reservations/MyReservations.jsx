// Plik: Frontend/src/components/reservations/MyReservations.jsx
import { useState, useEffect } from 'react';
import { reservationStatusLabels, reservationStatusStyles } from '../../utils/statuses';
import { getMyReservations } from '../../api/reservationApi';
import { getRoomTypes } from '../../api/adminApi';
import { photoUrl } from '../../api/roomApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate, nightsLabel } from '../../utils/format';
import ReservationDetails from './ReservationDetails';
import Alert from '../common/Alert';
import RoomPhotoPlaceholder from '../common/RoomPhotoPlaceholder';

// Lista rezerwacji gościa z panelem szczegółów obok.
// Szczegóły rezerwacji otwierają się pod własnym adresem (#/moje-rezerwacje/12) - także z powiadomienia
export default function MyReservations({ token, refreshKey, selectedReservationId, onSelectReservation }) {
  const [reservations, setReservations] = useState([]);
  const [photos, setPhotos] = useState({});
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // refreshKey - nowa rezerwacja z formularza, reloadKey - zmiana w oknie szczegółów (np. anulowanie)
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getMyReservations(token);
        setReservations(data);
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, refreshKey, reloadKey]);

  // Zdjęcia typów pokoi do kart rezerwacji (lista rezerwacji zawiera nazwę typu pokoju) - brak zdjęć nie blokuje listy
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const types = await getRoomTypes();
        setPhotos(Object.fromEntries(types.filter(rt => rt.mainPhotoUrl).map(rt => [rt.name, photoUrl(rt.mainPhotoUrl)])));
      } catch {
        // karty pokażą obrazek zastępczy
      }
    };
    loadPhotos();
  }, []);

  // Aktywna = oczekująca lub potwierdzona, której termin wymeldowania jeszcze nie minął
  const isActive = (r) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (r.status === 'pending' || r.status === 'confirmed') && new Date(r.checkOutDate) >= today;
  };

  const filters = [
    { id: 'all', label: 'Wszystkie', test: () => true },
    { id: 'active', label: 'Nadchodzące', test: isActive },
    { id: 'history', label: 'Historia', test: r => !isActive(r) }
  ];
  const filteredReservations = reservations.filter(filters.find(f => f.id === filter).test);
  const selected = reservations.find(r => r.reservationId === selectedReservationId);
  const nightsOf = (r) => Math.round((new Date(r.checkOutDate).getTime() - new Date(r.checkInDate).getTime()) / 86400000);

  return (
    <div className="w-full max-w-page space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <h1 className="text-4xl md:text-[2.75rem] font-medium">Moje rezerwacje</h1>
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={`chip ${filter === f.id ? 'chip-active' : ''}`}>
              {f.label} ({reservations.filter(f.test).length})
            </button>
          ))}
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <div className="flex flex-wrap gap-8 items-start">
        {/* --- LISTA --- */}
        <section className="flex-[1_1_26rem] min-w-0 space-y-3">
          {filteredReservations.map(r => {
            const isSelected = r.reservationId === selectedReservationId;
            return (
              <button key={r.reservationId} type="button" onClick={() => onSelectReservation(r.reservationId)} aria-current={isSelected}
                className={`w-full flex gap-4 items-center text-left rounded-2xl bg-white p-3 transition-colors ${isSelected ? 'border-2 border-navy-900' : 'border border-sand-300 m-px hover:border-navy-900'}`}>
                <span className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-sand-100">
                  {photos[r.roomTypeName] ? <img src={photos[r.roomTypeName]} alt="" loading="lazy" className="w-full h-full object-cover" /> : <RoomPhotoPlaceholder />}
                </span>
                <span className="min-w-0 flex-1 flex flex-col gap-1">
                  <span className="flex justify-between items-center gap-2">
                    <span className="text-[13px] text-slate-500">Rezerwacja #{r.reservationId} · pokój {r.roomNumber}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${reservationStatusStyles[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{reservationStatusLabels[r.status] ?? r.status}</span>
                  </span>
                  <span className="font-display text-xl">{r.roomTypeName}</span>
                  <span className="text-sm text-slate-600">{formatDate(r.checkInDate)} - {formatDate(r.checkOutDate)} · {nightsLabel(nightsOf(r))}</span>
                  <span className="text-sm font-semibold">
                    {r.totalPrice.toFixed(2)} zł
                    {r.status === 'pending' && <span className="font-medium text-warning-700"> · opłać do {formatDate(r.paymentDeadline)}</span>}
                  </span>
                </span>
              </button>
            );
          })}
          {filteredReservations.length === 0 && <p className="p-6 rounded-2xl bg-sand-100 text-slate-600">Brak rezerwacji do wyświetlenia.</p>}
        </section>

        {/* --- SZCZEGÓŁY WYBRANEJ REZERWACJI --- */}
        <div className="flex-[1_1_32rem] min-w-0">
          {selectedReservationId ? (
            <ReservationDetails key={selectedReservationId} token={token} reservationId={selectedReservationId} isOwner={false} inline photo={selected ? photos[selected.roomTypeName] : null}
              onClose={() => onSelectReservation(null)} onChanged={() => setReloadKey(key => key + 1)} />
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center gap-2 min-h-80 rounded-2xl border border-dashed border-sand-400 p-8 text-center text-slate-500">
              <span className="font-display text-xl text-navy-900">Wybierz rezerwację z listy</span>
              <span className="text-sm">Zobaczysz rozliczenie, zmienisz termin, anulujesz pobyt albo wystawisz opinię.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
