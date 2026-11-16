// Plik: Frontend/src/components/reservations/OnlinePayment.jsx
import { useState } from 'react';
import { payOnline } from '../../api/reservationApi';
import { errorMessage } from '../../api/apiErrors';
import Alert from '../common/Alert';

// Suma kontrolna numeru karty (algorytm Luhna) - wyłapuje literówki tak jak prawdziwe bramki płatnicze
const isValidCardNumber = (digits) => {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  [...digits].reverse().forEach((char, i) => {
    let digit = Number(char);
    if (i % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  });
  return sum % 10 === 0;
};

// Data ważności MM/RR - karta ważna do końca podanego miesiąca
const isValidExpiry = (value) => {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12) return false;
  const now = new Date();
  return new Date(2000 + Number(match[2]), Number(match[1]), 1) > now;
};

// Numer karty w grupach po 4 cyfry, data ważności z ukośnikiem
const formatCardNumber = (value) => value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (value) => { const digits = value.replace(/\D/g, '').slice(0, 4); return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits; };

// Okno płatności online gościa - symulacja bramki płatniczej (karta albo BLIK).
// Dane karty i kod BLIK są sprawdzane tylko tutaj, w przeglądarce; do API trafia wyłącznie wybrana metoda,
// a API zapisuje wpłatę całej brakującej kwoty (ReservationService.PayOnlineAsync)
export default function OnlinePayment({ token, reservationId, amount, onPaid, onClose }) {
  const [method, setMethod] = useState('BLIK');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', holder: '' });
  const [blikCode, setBlikCode] = useState('');
  const [error, setError] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const validate = () => {
    if (method === 'BLIK') return /^\d{6}$/.test(blikCode) ? '' : 'Kod BLIK ma 6 cyfr - sprawdź go w aplikacji banku.';
    if (!card.holder.trim()) return 'Podaj imię i nazwisko z karty.';
    if (!isValidCardNumber(card.number.replace(/\s/g, ''))) return 'Nieprawidłowy numer karty.';
    if (!isValidExpiry(card.expiry)) return 'Nieprawidłowa albo minęła data ważności karty (MM/RR).';
    if (!/^\d{3,4}$/.test(card.cvc)) return 'Kod CVC ma 3 cyfry (na odwrocie karty).';
    return '';
  };

  const handlePay = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setIsPaying(true);
    try {
      const result = await payOnline(reservationId, { method }, token);
      onPaid(result?.message ?? 'Płatność przyjęta.');
    } catch (err) {
      setError(errorMessage(err));
      setIsPaying(false);
    }
  };

  const tab = (active) => `rounded-[9px] py-2.5 text-[15px] font-semibold transition-colors ${active ? 'bg-white text-navy-900 shadow-[0_1px_4px_rgb(20_33_61_/_0.12)]' : 'text-slate-500 hover:text-navy-900'}`;
  const switchMethod = (next) => { setMethod(next); setError(''); };

  return (
    <div className="fixed inset-0 bg-navy-950/50 flex items-center justify-center p-4 z-[60]" onClick={isPaying ? undefined : onClose}>
      <form onSubmit={handlePay} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="payment-title"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 md:p-7 space-y-5">
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="text-sm text-slate-500">Rezerwacja #{reservationId}</p>
            <h2 id="payment-title" className="mt-1 text-2xl font-medium">Płatność online</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isPaying} aria-label="Zamknij płatność" className="w-10 h-10 rounded-full border border-slate-300 text-xl text-slate-600 hover:border-navy-900 hover:text-navy-900">×</button>
        </div>

        <div className="flex justify-between items-baseline p-4 rounded-[14px] bg-sand-50">
          <span className="font-semibold">Do zapłaty</span>
          <span className="font-display text-3xl font-semibold">{amount.toFixed(2)} zł</span>
        </div>

        <div role="tablist" aria-label="Metoda płatności" className="grid grid-cols-2 rounded-xl bg-sand-100 p-1">
          <button type="button" role="tab" aria-selected={method === 'BLIK'} onClick={() => switchMethod('BLIK')} className={tab(method === 'BLIK')}>BLIK</button>
          <button type="button" role="tab" aria-selected={method === 'card'} onClick={() => switchMethod('card')} className={tab(method === 'card')}>Karta płatnicza</button>
        </div>

        {method === 'BLIK' ? (
          <label className="field-label">Kod BLIK z aplikacji banku
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={blikCode}
              onChange={e => setBlikCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="field font-display text-2xl tracking-[0.4em] text-center" />
          </label>
        ) : (
          <div className="space-y-4">
            <label className="field-label">Imię i nazwisko z karty
              <input type="text" autoComplete="cc-name" value={card.holder} onChange={e => setCard({ ...card, holder: e.target.value })} className="field font-normal" />
            </label>
            <label className="field-label">Numer karty
              <input type="text" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={card.number}
                onChange={e => setCard({ ...card, number: formatCardNumber(e.target.value) })} className="field font-normal tracking-wider" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">Ważna do
                <input type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/RR" value={card.expiry}
                  onChange={e => setCard({ ...card, expiry: formatExpiry(e.target.value) })} className="field font-normal" />
              </label>
              <label className="field-label">CVC
                <input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="123" value={card.cvc}
                  onChange={e => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="field font-normal" />
              </label>
            </div>
          </div>
        )}

        {error && <Alert type="error" message={error} />}

        <button type="submit" disabled={isPaying} className="btn-primary w-full py-4">
          {isPaying ? 'Przetwarzanie płatności...' : `Zapłać ${amount.toFixed(2)} zł`}
        </button>

        {/* Projekt nie łączy się z prawdziwą bramką płatniczą (np. Przelewy24, PayU) */}
        <p className="p-3.5 rounded-xl bg-sand-100 text-[13px] leading-relaxed text-slate-600">
          <strong className="text-navy-900">Płatność testowa.</strong> To symulacja bramki płatniczej - pieniądze nie są pobierane.
          Dane karty i kod BLIK są sprawdzane tylko w przeglądarce i nie są nigdzie wysyłane ani zapisywane.
          Testowy numer karty: 4111 1111 1111 1111.
        </p>
      </form>
    </div>
  );
}
