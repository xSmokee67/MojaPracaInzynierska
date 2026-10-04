// Plik: Frontend/src/components/ReservationDetails.tsx
import { useState, useEffect } from 'react';
import type { ReservationDetailsDto, PaymentDto, ReviewDto } from '../types/reservation';
import { reservationStatusLabels, reservationStatusStyles, paymentMethodLabels, paymentStatusLabels } from '../types/reservation';
import { getReservationDetails, cancelReservation, registerPayment, issueInvoice, createReview } from '../api/reservationApi';
import { errorMessage } from '../api/apiErrors';

export default function ReservationDetails({ token, reservationId, isOwner, onClose, onChanged }: { token: string; reservationId: number; isOwner: boolean; onClose: () => void; onChanged: () => void }) {
  const [details, setDetails] = useState<ReservationDetailsDto | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Stany dla formularzy
  const [newPayment, setNewPayment] = useState<PaymentDto>({ amount: 0, method: 'card', status: 'completed' });
  const [newReview, setNewReview] = useState<ReviewDto>({ reservationId, rating: 5, comment: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getReservationDetails(reservationId, token);
        setDetails(data);
        setNewPayment(prev => ({ ...prev, amount: Math.max(data.totalPrice - data.paidAmount, 0) }));
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reservationId, reloadKey]);

  // Wspólna obsługa akcji: komunikat, odświeżenie szczegółów i listy
  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      setReloadKey(key => key + 1);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // Handler dla Gościa
  const handleCancel = async () => {
    if (!window.confirm('Na pewno anulować rezerwację? Tej operacji nie można cofnąć.')) return;
    await runAction(() => cancelReservation(reservationId, token), 'Rezerwacja została anulowana.');
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(() => createReview(newReview, token), 'Dziękujemy za wystawienie opinii!');
  };

  // Handlery dla Właściciela
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(() => registerPayment(reservationId, newPayment, token), 'Płatność została zarejestrowana.');
  };

  const handleIssueInvoice = async () => {
    if (!window.confirm('Wystawić fakturę dla tej rezerwacji?')) return;
    await runAction(() => issueInvoice(reservationId, token), 'Faktura została wystawiona.');
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const canCancel = details !== null && (details.status === 'pending' || details.status === 'confirmed') && new Date(details.checkInDate) > today;
  const nights = details ? Math.round((new Date(details.checkOutDate).getTime() - new Date(details.checkInDate).getTime()) / 86400000) : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-xl shadow-lg space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800">Rezerwacja #{reservationId}</h2>
          <button onClick={onClose} className="text-sm px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Zamknij</button>
        </div>

        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
        {message && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">{message}</div>}

        {details && (
          <>
            {/* --- DANE REZERWACJI --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
              {isOwner && (
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase">Gość</span>
                  <span className="font-medium text-slate-800">{details.guestName}</span> <span className="text-sm text-slate-500">({details.guestEmail})</span>
                </div>
              )}
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">Pokój</span>
                <span className="font-bold text-slate-800">{details.roomNumber}</span> <span className="text-slate-600">({details.roomTypeName})</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">Termin pobytu</span>
                <span className="text-slate-800">{new Date(details.checkInDate).toLocaleDateString()} - {new Date(details.checkOutDate).toLocaleDateString()} ({nights} nocy)</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">Usługi dodatkowe</span>
                <span className="text-slate-800">{details.additionalServices.length > 0 ? details.additionalServices.join(', ') : '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${reservationStatusStyles[details.status] ?? 'bg-slate-100 text-slate-600'}`}>{reservationStatusLabels[details.status] ?? details.status}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">Rozliczenie</span>
                <span className="font-bold text-emerald-600">{details.totalPrice.toFixed(2)} PLN</span> <span className="text-sm text-slate-500">(wpłacono {details.paidAmount.toFixed(2)} PLN)</span>
              </div>
            </div>

            {!isOwner && canCancel && (
              <button onClick={handleCancel} className="w-full py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Anuluj rezerwację</button>
            )}

            {/* --- PŁATNOŚCI --- */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 text-lg">Płatności</h3>
              {isOwner && details.status !== 'cancelled' && (
                <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Kwota (PLN)</label>
                    <input type="number" required min="0.01" step="0.01" value={newPayment.amount || ''} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Metoda</label>
                    <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
                      {Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Status</label>
                    <select value={newPayment.status} onChange={e => setNewPayment({...newPayment, status: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
                      {Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Zarejestruj płatność</button>
                  </div>
                </form>
              )}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                      <th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Kwota</th>
                      <th className="p-4 font-semibold">Metoda</th><th className="p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.payments.map(p => (
                      <tr key={p.paymentId} className="border-b hover:bg-slate-50">
                        <td className="p-4 text-slate-600">{new Date(p.paymentDate!).toLocaleString()}</td>
                        <td className="p-4 font-bold text-slate-800">{p.amount.toFixed(2)} PLN</td>
                        <td className="p-4 text-slate-600">{paymentMethodLabels[p.method] ?? p.method}</td>
                        <td className="p-4 text-slate-600">{paymentStatusLabels[p.status] ?? p.status}</td>
                      </tr>
                    ))}
                    {details.payments.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Brak zarejestrowanych płatności.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- FAKTURA --- */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 text-lg">Faktura</h3>
              {details.invoice ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border">
                  <div><span className="block text-xs font-semibold text-slate-500 uppercase">Numer</span><span className="font-bold text-slate-800">{details.invoice.invoiceNumber}</span></div>
                  <div><span className="block text-xs font-semibold text-slate-500 uppercase">Data wystawienia</span><span className="text-slate-800">{new Date(details.invoice.issueDate).toLocaleDateString()}</span></div>
                  <div><span className="block text-xs font-semibold text-slate-500 uppercase">Kwota brutto</span><span className="font-bold text-emerald-600">{details.invoice.grossAmount.toFixed(2)} PLN</span></div>
                </div>
              ) : isOwner ? (
                <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border">
                  <span className="text-sm text-slate-600">{details.status === 'completed' ? 'Pobyt zrealizowany - można wystawić fakturę.' : 'Fakturę można wystawić po oznaczeniu rezerwacji jako zrealizowanej.'}</span>
                  <button onClick={handleIssueInvoice} disabled={details.status !== 'completed'} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed">Wystaw fakturę</button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Faktura zostanie wystawiona po zakończonym pobycie.</p>
              )}
            </div>

            {/* --- OPINIA --- */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 text-lg">Opinia o pobycie</h3>
              {details.review ? (
                <div className="bg-slate-50 p-4 rounded-lg border space-y-1">
                  <div className="text-amber-500 text-lg">{'★'.repeat(details.review.rating)}{'☆'.repeat(5 - details.review.rating)}</div>
                  <p className="text-slate-700">{details.review.comment || 'Brak komentarza.'}</p>
                </div>
              ) : !isOwner && details.status === 'completed' ? (
                <form onSubmit={handleAddReview} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Ocena</label>
                    <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
                      {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{'★'.repeat(r)} ({r})</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Komentarz</label>
                    <input type="text" maxLength={500} value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
                  </div>
                  <div>
                    <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Dodaj opinię</button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-slate-500">{isOwner ? 'Gość nie wystawił jeszcze opinii.' : 'Opinię będzie można dodać po zakończonym pobycie.'}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}