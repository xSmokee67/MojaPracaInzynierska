// Plik: Frontend/src/components/MyReservations.tsx
import { useState, useEffect } from 'react';
import type { ReservationDto } from '../types/reservation';
import { reservationStatusLabels, reservationStatusStyles } from '../types/reservation';
import { getMyReservations } from '../api/reservationApi';
import { errorMessage } from '../api/apiErrors';
import ReservationDetails from './ReservationDetails';

export default function MyReservations({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'history'>('all');
  const [error, setError] = useState('');
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
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

  // Aktywna = oczekująca lub potwierdzona, której termin wymeldowania jeszcze nie minął
  const isActive = (r: ReservationDto) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (r.status === 'pending' || r.status === 'confirmed') && new Date(r.checkOutDate) >= today;
  };

  const filteredReservations = reservations.filter(r =>
    filter === 'all' ? true : filter === 'active' ? isActive(r) : !isActive(r)
  );

  return (
    <div className="w-full max-w-5xl p-4 md:p-6 bg-white rounded-xl shadow-lg space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Moje rezerwacje</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Wszystkie</button>
          <button onClick={() => setFilter('active')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Aktywne</button>
          <button onClick={() => setFilter('history')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filter === 'history' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Historia</button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-sm border-b">
              <th className="p-4 font-semibold">Nr</th><th className="p-4 font-semibold">Pokój</th>
              <th className="p-4 font-semibold">Termin pobytu</th><th className="p-4 font-semibold">Usługi dodatkowe</th>
              <th className="p-4 font-semibold">Cena</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.map(r => (
              <tr key={r.reservationId} className="border-b hover:bg-slate-50">
                <td className="p-4 text-slate-500">#{r.reservationId}</td>
                <td className="p-4"><span className="font-bold text-slate-800">{r.roomNumber}</span> <span className="text-slate-600">({r.roomTypeName})</span></td>
                <td className="p-4 text-slate-600">{new Date(r.checkInDate).toLocaleDateString()} - {new Date(r.checkOutDate).toLocaleDateString()}</td>
                <td className="p-4 text-slate-600">{r.additionalServices.length > 0 ? r.additionalServices.join(', ') : '—'}</td>
                <td className="p-4 font-bold text-emerald-600">{r.totalPrice.toFixed(2)} PLN</td>
                <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${reservationStatusStyles[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{reservationStatusLabels[r.status] ?? r.status}</span></td>
                <td className="p-4 text-right"><button onClick={() => setSelectedReservationId(r.reservationId)} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm">Szczegóły</button></td>
              </tr>
            ))}
            {filteredReservations.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-slate-500">Brak rezerwacji do wyświetlenia.</td></tr>}
          </tbody>
        </table>
      </div>

      {selectedReservationId && (
        <ReservationDetails token={token} reservationId={selectedReservationId} isOwner={false} onClose={() => setSelectedReservationId(null)} onChanged={() => setReloadKey(key => key + 1)} />
      )}
    </div>
  );
}