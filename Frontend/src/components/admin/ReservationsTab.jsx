// Plik: Frontend/src/components/admin/ReservationsTab.jsx
import { useState, useEffect } from 'react';
import { reservationStatusLabels, reservationStatusStyles } from '../../utils/statuses';
import { getAllReservations, updateReservationStatus } from '../../api/reservationApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate, personsLabel, nightsLabel } from '../../utils/format';
import ReservationDetails from '../reservations/ReservationDetails';
import Alert from '../common/Alert';

// Zakładka "Rezerwacje": wszystkie rezerwacje z filtrami, zmianą statusu i szczegółami (płatności, faktura).
// Nad tabelą przypomnienie o rezerwacjach czekających na wpłatę
export default function ReservationsTab({ token, selectedReservationId, onSelectReservation }) {
  const [reservations, setReservations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [guestFilter, setGuestFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setReservations(await getAllReservations(token));
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text) => { setMessage(text); setError(''); };

  const handleChangeStatus = async (id, status) => {
    if (status === 'cancelled' && !window.confirm('Na pewno anulować tę rezerwację? Przy anulowaniu przez hotel gościowi należy się zwrot całej wpłaty (zwrot zarejestruj w szczegółach rezerwacji). Tej operacji nie można cofnąć.')) return;
    try { await updateReservationStatus(id, { status }, token); showSuccess(`Status rezerwacji #${id} został zmieniony.`); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  // Filtrowanie rezerwacji po statusie, dacie (pobyt obejmujący wybrany dzień) oraz gościu albo numerze rezerwacji
  const filteredReservations = reservations.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (dateFilter && (r.checkInDate.slice(0, 10) > dateFilter || r.checkOutDate.slice(0, 10) < dateFilter)) return false;
    if (guestFilter && !`#${r.reservationId} ${r.guestName} ${r.guestEmail}`.toLowerCase().includes(guestFilter.toLowerCase().trim())) return false;
    return true;
  });

  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const pendingText = pendingCount === 1 ? '1 rezerwacja czeka' : `${pendingCount} ${[2, 3, 4].includes(pendingCount % 10) && ![12, 13, 14].includes(pendingCount % 100) ? 'rezerwacje czekają' : 'rezerwacji czeka'}`;
  const nightsOf = (r) => Math.round((new Date(r.checkOutDate).getTime() - new Date(r.checkInDate).getTime()) / 86400000);
  const hasFilters = statusFilter !== 'all' || dateFilter || guestFilter;

  return (
    <>
      <div className="space-y-5">
        {error && <Alert type="error" message={error} />}
        {message && !error && <Alert type="success" message={message} />}

        {/* --- DO ZROBIENIA: rezerwacje czekające na wpłatę --- */}
        {pendingCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 rounded-[14px] bg-warning-50 border border-warning-100">
            <p className="text-[15px] text-warning-700"><strong>{pendingText} na wpłatę.</strong> Wpłata całej kwoty potwierdza rezerwację, nieopłacona do terminu płatności zostanie automatycznie anulowana.</p>
            {statusFilter !== 'pending' && <button type="button" onClick={() => setStatusFilter('pending')} className="px-4 py-2.5 rounded-[10px] bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800">Pokaż oczekujące</button>}
          </div>
        )}

        {/* --- FILTRY --- */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <label className="flex-[1_1_16rem] flex items-center gap-2.5 min-h-11 px-3.5 rounded-[10px] border border-slate-300 bg-white focus-within:border-navy-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-500 shrink-0" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" value={guestFilter} onChange={e => setGuestFilter(e.target.value)} placeholder="Szukaj: gość, e-mail, numer rezerwacji" aria-label="Szukaj rezerwacji" className="flex-1 min-w-0 bg-transparent text-[15px] outline-none" />
          </label>
          <label className="flex items-center gap-2 min-h-11 px-3.5 rounded-[10px] border border-slate-300 bg-white text-sm text-slate-500 focus-within:border-navy-900">
            Pobyt w dniu
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-transparent text-navy-900 outline-none" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={() => setStatusFilter('all')} aria-pressed={statusFilter === 'all'} className={`chip ${statusFilter === 'all' ? 'chip-active' : ''}`}>Wszystkie</button>
          {Object.entries(reservationStatusLabels).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`chip ${statusFilter === value ? 'chip-active' : ''}`}>{label}</button>
          ))}
          {hasFilters && <button type="button" onClick={() => { setStatusFilter('all'); setDateFilter(''); setGuestFilter(''); }} className="link text-sm ml-2">Wyczyść filtry</button>}
        </div>

        {/* --- TABELA --- */}
        <div className="overflow-x-auto card">
          <table className="data-table min-w-[48rem]">
            <thead>
              <tr>
                <th className="px-4 py-3.5">Nr</th><th className="px-4 py-3.5">Gość</th>
                <th className="px-4 py-3.5">Pokój</th><th className="px-4 py-3.5">Pobyt</th>
                <th className="px-4 py-3.5 text-right">Kwota</th><th className="px-4 py-3.5">Status (zmień)</th><th className="relative px-4 py-3.5"><span className="sr-only">Akcje</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map(r => (
                <tr key={r.reservationId} className={`hover:bg-sand-50 ${r.reservationId === selectedReservationId ? 'bg-sand-50' : ''}`}>
                  <td className="px-4 py-3.5 font-bold">#{r.reservationId}</td>
                  <td className="px-4 py-3.5"><div className="font-semibold">{r.guestName}</div><div className="text-[13px] text-slate-500">{r.guestEmail}</div></td>
                  <td className="px-4 py-3.5"><div className="font-semibold">pokój {r.roomNumber}</div><div className="text-[13px] text-slate-500">{r.roomTypeName}</div></td>
                  <td className="px-4 py-3.5"><div className="whitespace-nowrap">{formatDate(r.checkInDate)} - {formatDate(r.checkOutDate)}</div><div className="text-[13px] text-slate-500">{nightsLabel(nightsOf(r))} · {personsLabel(r.numberOfGuests)}</div></td>
                  <td className="px-4 py-3.5 text-right font-semibold whitespace-nowrap">{r.totalPrice.toFixed(2)} zł</td>
                  <td className="px-4 py-3.5">
                    {/* Status jako kolorowa etykieta z listą - wybranie innego statusu zmienia go od razu (anulowanej nie można zmienić) */}
                    <select value={r.status} disabled={r.status === 'cancelled'} onChange={e => handleChangeStatus(r.reservationId, e.target.value)} aria-label={`Status rezerwacji #${r.reservationId} - zmień`}
                      className={`pl-3 pr-1 py-1.5 rounded-full text-xs font-bold outline-none cursor-pointer border border-transparent hover:border-navy-900 disabled:cursor-default disabled:hover:border-transparent ${reservationStatusStyles[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {Object.entries(reservationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {r.status === 'pending' && <div className="mt-1 text-xs text-warning-700 whitespace-nowrap">wpłata do {formatDate(r.paymentDeadline)}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap"><button onClick={() => onSelectReservation(r.reservationId)} className="text-sm font-semibold hover:text-brass-700 hover:underline">Szczegóły</button></td>
                </tr>
              ))}
              {filteredReservations.length === 0 && <tr><td colSpan={7} className="px-4 py-5 text-center text-slate-500">Brak rezerwacji spełniających kryteria.</td></tr>}
            </tbody>
          </table>
        </div>

        <p className="text-sm leading-relaxed text-slate-500">
          Statusy zmieniają się też automatycznie: zarejestrowanie wpłaty całej kwoty potwierdza oczekującą rezerwację,
          rezerwacja nieopłacona do terminu płatności (3 dni od rezerwacji, najpóźniej dzień przed przyjazdem) zostaje anulowana,
          a potwierdzona dzień po wymeldowaniu staje się zakończona (sprawdzane co godzinę). Anulowanie zwalnia noce rezerwacji dla innych gości.
        </p>
      </div>

      {selectedReservationId && (
        <ReservationDetails token={token} reservationId={selectedReservationId} isOwner={true} onClose={() => onSelectReservation(null)} onChanged={reload} />
      )}
    </>
  );
}