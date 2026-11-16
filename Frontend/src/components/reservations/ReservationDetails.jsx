// Plik: Frontend/src/components/reservations/ReservationDetails.jsx
import { useState, useEffect, useRef } from 'react';
import { reservationStatusLabels, reservationStatusStyles, paymentMethodLabels, paymentStatusLabels } from '../../utils/statuses';
import { getReservationDetails, cancelReservation, registerPayment, issueInvoice, createReview } from '../../api/reservationApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate, formatDateTime, nightsLabel, personsLabel } from '../../utils/format';
import Alert from '../common/Alert';
import StarRating from '../common/StarRating';
import { hotelInfo } from '../../utils/hotelInfo';

// Szczegóły rezerwacji: dane pobytu, rozliczenie, informacja o płatności, anulowanie, płatności, faktura i opinia.
// Gość widzi je w panelu obok listy (inline, ze zdjęciem pokoju), właściciel - w oknie nad tabelą rezerwacji
export default function ReservationDetails({ token, reservationId, isOwner, onClose, onChanged, inline = false, photo = null }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Stany dla formularzy
  const [newPayment, setNewPayment] = useState({ amount: 0, method: 'card', status: 'completed' });
  const [newReview, setNewReview] = useState({ reservationId, rating: 5, comment: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getReservationDetails(reservationId, token);
        setDetails(data);
        // Podpowiedź w formularzu płatności: brakująca kwota, a dla anulowanej rezerwacji - zwrot wpłaconej kwoty
        setNewPayment(prev => data.status === 'cancelled'
          ? { ...prev, amount: Math.max(data.paidAmount - data.cancellationFee, 0), status: 'refunded' }
          : { ...prev, amount: Math.max(data.totalPrice - data.paidAmount, 0) });
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reservationId, reloadKey]);

  // Na wąskim ekranie panel leży pod listą - po wybraniu rezerwacji przewijamy do niego
  useEffect(() => {
    if (inline && window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [inline, reservationId]);

  // Wspólna obsługa akcji: komunikat, odświeżenie szczegółów i listy
  const runAction = async (action, successMessage) => {
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
    // W potwierdzeniu konkretne kwoty według polityki anulowania (bezpłatnie do 7 dni przed przyjazdem, później 30%)
    const fee = details.cancellationFeeIfCancelledToday;
    const refundText = details.paidAmount <= 0
      ? 'Nie było wpłat, więc nie ma nic do zwrotu.'
      : fee > 0
        ? `Hotel zwróci ${(details.paidAmount - fee).toFixed(2)} zł z wpłaconych ${details.paidAmount.toFixed(2)} zł i zatrzyma ${fee.toFixed(2)} zł opłaty za anulowanie.`
        : `Hotel zwróci całą wpłatę: ${details.paidAmount.toFixed(2)} zł.`;
    if (!window.confirm(`Na pewno anulować rezerwację? ${refundText} Tej operacji nie można cofnąć.`)) return;
    await runAction(() => cancelReservation(reservationId, token), 'Rezerwacja została anulowana.');
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    await runAction(() => createReview(newReview, token), 'Dziękujemy za wystawienie opinii!');
  };

  // Handlery dla Właściciela
  const handleAddPayment = async (e) => {
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

  const term = 'block text-xs font-bold uppercase tracking-[0.06em] text-brass-700';
  const subTitle = 'text-xl font-medium';
  const toPay = details ? Math.max(details.totalPrice - details.paidAmount, 0) : 0;
  // Gość widzi, ile i jak zapłacić, dopóki rezerwacja (oczekująca albo potwierdzona przez hotel przed wpłatą całości) nie jest opłacona
  const showPaymentInfo = !isOwner && details !== null && (details.status === 'pending' || details.status === 'confirmed') && toPay > 0;

  const content = (
    <>
      {inline && photo && <img src={photo} alt={details?.roomTypeName ?? ''} className="w-full h-48 md:h-52 object-cover" />}
      <div className="p-5 md:p-7 space-y-6">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <p className="text-sm text-slate-500">Rezerwacja #{reservationId}{details && ` · pokój ${details.roomNumber}`}</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-medium">{details?.roomTypeName ?? 'Rezerwacja'}</h2>
          </div>
          <div className="flex items-center gap-3">
            {details && <span className={`px-3 py-1.5 rounded-full text-[13px] font-bold ${reservationStatusStyles[details.status] ?? 'bg-slate-100 text-slate-600'}`}>{reservationStatusLabels[details.status] ?? details.status}</span>}
            <button onClick={onClose} aria-label="Zamknij szczegóły" className="w-10 h-10 rounded-full border border-slate-300 text-xl text-slate-600 hover:border-navy-900 hover:text-navy-900">×</button>
          </div>
        </div>

        {error && <Alert type="error" message={error} />}
        {message && <Alert type="success" message={message} />}

        {details && (
          <>
            {/* --- DANE REZERWACJI --- */}
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-4">
              {isOwner && (
                <div className="col-span-full">
                  <dt className={term}>Gość</dt>
                  <dd className="mt-1"><span className="font-medium">{details.guestName}</span> <span className="text-sm text-slate-500">({details.guestEmail})</span></dd>
                </div>
              )}
              <div><dt className={term}>Przyjazd</dt><dd className="mt-1">{formatDate(details.checkInDate)}<span className="block text-sm text-slate-500">od 14:00</span></dd></div>
              <div><dt className={term}>Wyjazd</dt><dd className="mt-1">{formatDate(details.checkOutDate)}<span className="block text-sm text-slate-500">do 11:00</span></dd></div>
              <div><dt className={term}>Goście</dt><dd className="mt-1">{personsLabel(details.numberOfGuests)} · {nightsLabel(nights)}</dd></div>
              <div className="col-span-full"><dt className={term}>Usługi dodatkowe</dt><dd className="mt-1">{details.additionalServices.length > 0 ? details.additionalServices.join(', ') : '—'}</dd></div>
            </dl>

            {/* --- ROZLICZENIE --- */}
            <div className="p-4 md:p-5 rounded-[14px] bg-sand-50 space-y-2 text-[15px] text-slate-600">
              <div className="flex justify-between gap-3 font-bold text-navy-900"><span>Razem</span><span>{details.totalPrice.toFixed(2)} zł</span></div>
              <div className="flex justify-between gap-3"><span>Wpłacono</span><span>{details.paidAmount.toFixed(2)} zł</span></div>
              {details.refundedAmount > 0 && <div className="flex justify-between gap-3"><span>Zwrócono (odjęte od wpłat)</span><span>{details.refundedAmount.toFixed(2)} zł</span></div>}
              {details.status !== 'cancelled' && <div className="flex justify-between gap-3 border-t border-sand-200 pt-2 font-bold text-navy-900"><span>Do zapłaty</span><span>{toPay.toFixed(2)} zł</span></div>}
              {/* Anulowana z wpłatą: opłata za anulowanie i kwota do zwrotu */}
              {details.status === 'cancelled' && details.paidAmount > 0 && (
                <div className="border-t border-sand-200 pt-2 font-medium text-warning-700">
                  {details.cancellationFee > 0 && <>Opłata za anulowanie (zostaje w hotelu): {details.cancellationFee.toFixed(2)} zł. </>}
                  {details.paidAmount - details.cancellationFee > 0
                    ? <>Do zwrotu gościowi: {(details.paidAmount - details.cancellationFee).toFixed(2)} zł.</>
                    : <>Rozliczone – nic więcej do zwrotu.</>}
                </div>
              )}
            </div>

            {/* Gość: ile i jak zapłacić - wpłatę (przelew albo płatność w recepcji) zapisuje w systemie hotel */}
            {showPaymentInfo && (
              <div className="p-4 md:p-5 rounded-[14px] bg-warning-50 border border-warning-100 text-sm leading-relaxed text-warning-700 space-y-1.5">
                <p>
                  <strong>Do zapłaty {toPay.toFixed(2)} zł{details.status === 'pending' && ` do ${formatDate(details.paymentDeadline)}`}.</strong>
                  {details.status === 'pending' && ' Po zaksięgowaniu wpłaty całej kwoty rezerwacja zostanie potwierdzona, a nieopłacona w terminie - automatycznie anulowana.'}
                </p>
                <p>
                  Zapłać przelewem (tytuł: <strong>Rezerwacja #{reservationId}</strong>) albo w recepcji hotelu - gotówką, kartą lub BLIK-iem.
                  Dane do przelewu poda recepcja: <a href={`tel:${hotelInfo.phone.replace(/\s/g, '')}`} className="font-semibold underline">{hotelInfo.phone}</a>.
                </p>
              </div>
            )}

            {/* Właściciel: oczekująca = jeszcze nieopłacona w całości - termin płatności i brakująca kwota */}
            {isOwner && details.status === 'pending' && (
              <p className="text-sm leading-relaxed text-warning-700 font-medium">
                Do zapłaty {toPay.toFixed(2)} zł do {formatDate(details.paymentDeadline)} - po zarejestrowaniu wpłaty całości rezerwacja zostanie potwierdzona, nieopłacona zostanie automatycznie anulowana.
              </p>
            )}

            {!isOwner && canCancel && (
              // Warunki anulowania (CancellationPolicy w API)
              <p className="text-sm leading-relaxed text-slate-500">
                Bezpłatne anulowanie do <span className="font-semibold text-navy-900">{formatDate(details.freeCancellationUntil)}</span> (7 dni przed przyjazdem).
                Później, najpóźniej dzień przed przyjazdem, hotel zatrzymuje 30% ceny pobytu z wpłaconej kwoty, a resztę zwraca.
                {details.cancellationFeeIfCancelledToday > 0 && <span className="block mt-1 font-medium text-warning-700">Anulowanie teraz: opłata {details.cancellationFeeIfCancelledToday.toFixed(2)} zł, zwrot {Math.max(details.paidAmount - details.cancellationFeeIfCancelledToday, 0).toFixed(2)} zł.</span>}
              </p>
            )}

            {/* --- ANULOWANIE --- */}
            {!isOwner && canCancel && <button onClick={handleCancel} className="btn-danger">Anuluj rezerwację</button>}

            {/* --- PŁATNOŚCI: właściciel - formularz i pełna tabela; gość - lista wpłat dopiero wtedy, gdy hotel coś zapisze --- */}
            {isOwner ? (
              <div className="space-y-3">
                <h3 className={subTitle}>Płatności</h3>
                {(details.status !== 'cancelled' || details.paidAmount - details.cancellationFee > 0) && (
                  <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end p-4 rounded-[14px] bg-sand-100">
                    <label className="field-label">Kwota (zł)
                      <input type="number" required min="0.01" step="0.01" value={newPayment.amount || ''} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} className="field font-normal" />
                    </label>
                    <label className="field-label">Metoda
                      <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className="field font-normal">
                        {Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="field-label">Status
                      <select value={newPayment.status} onChange={e => setNewPayment({...newPayment, status: e.target.value})} className="field font-normal">
                        {/* Do anulowanej rezerwacji API przyjmuje tylko zwrot */}
                        {Object.entries(paymentStatusLabels).filter(([value]) => details.status !== 'cancelled' || value === 'refunded').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <button type="submit" className="btn-primary">Zarejestruj płatność</button>
                  </form>
                )}
                <div className="overflow-x-auto card">
                  <table className="data-table">
                    <thead>
                      <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Kwota</th><th className="px-4 py-3">Metoda</th><th className="px-4 py-3">Status</th></tr>
                    </thead>
                    <tbody>
                      {details.payments.map(p => (
                        <tr key={p.paymentId}>
                          <td className="px-4 py-3 text-slate-600">{formatDateTime(p.paymentDate)}</td>
                          <td className="px-4 py-3 font-semibold">{p.amount.toFixed(2)} zł</td>
                          <td className="px-4 py-3 text-slate-600">{paymentMethodLabels[p.method] ?? p.method}</td>
                          <td className="px-4 py-3 text-slate-600">{paymentStatusLabels[p.status] ?? p.status}</td>
                        </tr>
                      ))}
                      {details.payments.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-500">Brak zarejestrowanych płatności.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : details.payments.length > 0 && (
              <div className="space-y-3">
                <h3 className={subTitle}>Twoje wpłaty</h3>
                <ul className="card px-4 divide-y divide-sand-200">
                  {details.payments.map(p => (
                    <li key={p.paymentId} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-sm">
                      <span className="text-slate-600">{formatDateTime(p.paymentDate)} · {paymentMethodLabels[p.method] ?? p.method}</span>
                      <span>
                        <span className="font-semibold">{p.status === 'refunded' ? '−' : ''}{p.amount.toFixed(2)} zł</span>
                        <span className="text-slate-500"> · {paymentStatusLabels[p.status] ?? p.status}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* --- FAKTURA --- */}
            <div className="space-y-3">
              <h3 className={subTitle}>Faktura</h3>
              {details.invoice ? (
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-[14px] bg-sand-50">
                  <div><dt className={term}>Numer</dt><dd className="mt-1 font-semibold">{details.invoice.invoiceNumber}</dd></div>
                  <div><dt className={term}>Data wystawienia</dt><dd className="mt-1">{formatDate(details.invoice.issueDate)}</dd></div>
                  <div><dt className={term}>Kwota brutto</dt><dd className="mt-1 font-semibold">{details.invoice.grossAmount.toFixed(2)} zł</dd></div>
                </dl>
              ) : isOwner ? (
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[14px] bg-sand-50">
                  <span className="text-sm text-slate-600">{details.status === 'completed' ? 'Pobyt zrealizowany - można wystawić fakturę.' : 'Fakturę można wystawić po oznaczeniu rezerwacji jako zrealizowanej.'}</span>
                  <button onClick={handleIssueInvoice} disabled={details.status !== 'completed'} className="btn-primary">Wystaw fakturę</button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Faktura zostanie wystawiona po zakończonym pobycie.</p>
              )}
            </div>

            {/* --- OPINIA --- */}
            <div className="space-y-3">
              <h3 className={subTitle}>Opinia o pobycie</h3>
              {details.review ? (
                <div className="p-4 rounded-[14px] bg-sand-50 space-y-1">
                  <div className="text-lg"><StarRating rating={details.review.rating} /></div>
                  <p className="text-slate-600">{details.review.comment || 'Brak komentarza.'}</p>
                </div>
              ) : !isOwner && details.status === 'completed' ? (
                <form onSubmit={handleAddReview} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <label className="field-label">Ocena
                    <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})} className="field font-normal">
                      {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{'★'.repeat(r)} ({r})</option>)}
                    </select>
                  </label>
                  <label className="field-label sm:col-span-2">Komentarz
                    <input type="text" maxLength={500} value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} className="field font-normal" />
                  </label>
                  <button type="submit" className="btn-primary">Dodaj opinię</button>
                </form>
              ) : (
                <p className="text-sm text-slate-500">{isOwner ? 'Gość nie wystawił jeszcze opinii.' : 'Opinię będzie można dodać po zakończonym pobycie.'}</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );

  // Panel obok listy rezerwacji gościa
  if (inline) {
    return <section ref={panelRef} className="card overflow-hidden shadow-[0_12px_40px_rgb(20_33_61_/_0.08)] scroll-mt-4">{content}</section>;
  }

  // Okno nad tabelą rezerwacji właściciela - kliknięcie tła zamyka
  return (
    <div className="fixed inset-0 bg-navy-950/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}
