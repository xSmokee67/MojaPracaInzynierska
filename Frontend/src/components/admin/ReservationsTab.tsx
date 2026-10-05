// Plik: Frontend/src/components/admin/ReservationsTab.tsx
import { useState, useEffect } from 'react';
import type { ReservationDto } from '../../types/reservation';
import { reservationStatusLabels, reservationStatusStyles } from '../../types/reservation';
import { getAllReservations, updateReservationStatus } from '../../api/reservationApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate } from '../../utils/format';
import ReservationDetails from '../ReservationDetails';
import Alert from '../Alert';

// Zakładka "Rezerwacje": wszystkie rezerwacje z filtrami, zmianą statusu i szczegółami (płatności, faktura)
export default function ReservationsTab({ token, selectedReservationId, onSelectReservation }: { token: string; selectedReservationId: number | null; onSelectReservation: (id: number | null) => void }) {
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
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
  const showSuccess = (text: string) => { setMessage(text); setError(''); };

  const handleChangeStatus = async (id: number, status: string) => {
    if (status === 'cancelled' && !window.confirm('Na pewno anulować tę rezerwację? Tej operacji nie można cofnąć.')) return;
    try { await updateReservationStatus(id, { status }, token); showSuccess(`Status rezerwacji #${id} został zmieniony.`); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  // Filtrowanie rezerwacji po statusie, dacie (pobyt obejmujący wybrany dzień) i gościu
  const filteredReservations = reservations.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (dateFilter && (r.checkInDate.slice(0, 10) > dateFilter || r.checkOutDate.slice(0, 10) < dateFilter)) return false;
    if (guestFilter && !`${r.guestName} ${r.guestEmail}`.toLowerCase().includes(guestFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {error && <Alert type="error" message={error} />}
      {message && !error && <Alert type="success" message={message} />}

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
              <option value="all">Wszystkie</option>
              {Object.entries(reservationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Pobyt w dniu</label>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Gość (imię, nazwisko, e-mail)</label>
            <input type="text" value={guestFilter} onChange={e => setGuestFilter(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <button type="button" onClick={() => { setStatusFilter('all'); setDateFilter(''); setGuestFilter(''); }} className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Wyczyść filtry</button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                <th className="p-4 font-semibold">Nr</th><th className="p-4 font-semibold">Gość</th>
                <th className="p-4 font-semibold">Pokój</th><th className="p-4 font-semibold">Termin pobytu</th>
                <th className="p-4 font-semibold">Cena</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Zmień status</th><th className="p-4 font-semibold text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map(r => (
                <tr key={r.reservationId} className="border-b hover:bg-slate-50">
                  <td className="p-4 text-slate-500">#{r.reservationId}</td>
                  <td className="p-4"><div className="font-medium text-slate-800">{r.guestName}</div><div className="text-xs text-slate-500">{r.guestEmail}</div></td>
                  <td className="p-4"><span className="font-bold text-slate-800">{r.roomNumber}</span> <span className="text-slate-600">({r.roomTypeName})</span></td>
                  <td className="p-4 text-slate-600">{formatDate(r.checkInDate)} - {formatDate(r.checkOutDate)}</td>
                  <td className="p-4 font-bold text-emerald-600">{r.totalPrice.toFixed(2)} PLN</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${reservationStatusStyles[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{reservationStatusLabels[r.status] ?? r.status}</span></td>
                  <td className="p-4 text-right">
                    <select value={r.status} disabled={r.status === 'cancelled'} onChange={e => handleChangeStatus(r.reservationId, e.target.value)} className="px-3 py-2 border rounded-lg outline-none bg-white text-sm disabled:bg-slate-100 disabled:text-slate-400">
                      {Object.entries(reservationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-right"><button onClick={() => onSelectReservation(r.reservationId)} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm">Szczegóły</button></td>
                </tr>
              ))}
              {filteredReservations.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-slate-500">Brak rezerwacji spełniających kryteria.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReservationId && (
        <ReservationDetails token={token} reservationId={selectedReservationId} isOwner={true} onClose={() => onSelectReservation(null)} onChanged={reload} />
      )}
    </>
  );
}