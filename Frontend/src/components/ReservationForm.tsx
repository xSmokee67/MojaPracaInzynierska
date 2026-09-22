// Plik: Frontend/src/components/ReservationForm.tsx
import { useState } from 'react';
import type { CreateReservationDto } from '../types/reservation';
import { checkAvailability, calculatePrice, createReservation } from '../api/reservationApi';

export default function ReservationForm({ token }: { token: string }) {
  const [roomTypeId, setRoomTypeId] = useState<number>(1); // Domyślnie typ pokoju ID 1
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Krok 1: Weryfikacja i kalkulacja
  const handleCheck = async () => {
    if (!checkInDate || !checkOutDate) {
      setStatusMessage('Wybierz najpierw daty pobytu.');
      return;
    }
    
    try {
      setStatusMessage('Sprawdzanie dostępności...');
      const avail = await checkAvailability(roomTypeId, checkInDate, checkOutDate);
      setIsAvailable(avail.isAvailable);
      
      if (avail.isAvailable) {
        const payload: CreateReservationDto = {
          guestId: 1, // Na razie przypisujemy na sztywno, docelowo pobierane z JWT
          roomTypeId,
          checkInDate,
          checkOutDate,
          additionalServiceIds: []
        };
        const priceData = await calculatePrice(payload);
        setTotalPrice(priceData.totalPrice);
        setStatusMessage('Pokój dostępny! Możesz dokończyć rezerwację.');
      } else {
        setTotalPrice(null);
        setStatusMessage(avail.message);
      }
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  // Krok 2: Finalizacja rezerwacji
  const handleBook = async () => {
    try {
      const payload: CreateReservationDto = {
        guestId: 1,
        roomTypeId,
        checkInDate,
        checkOutDate,
        additionalServiceIds: []
      };
      await createReservation(payload, token);
      setIsSuccess(true);
      setStatusMessage('Rezerwacja została pomyślnie potwierdzona!');
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-lg p-8 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-emerald-800">Udało się!</h2>
        <p className="text-emerald-600">{statusMessage}</p>
        <button onClick={() => setIsSuccess(false)} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          Złóż kolejną rezerwację
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg p-8 bg-white rounded-xl shadow-lg space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">Zarezerwuj pobyt</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Typ Pokoju</label>
          <select 
            value={roomTypeId} 
            onChange={(e) => setRoomTypeId(Number(e.target.value))}
            className="w-full mt-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={1}>Pokój Standardowy</option>
            <option value={2}>Apartament Premium</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Od (Zameldowanie)</label>
            <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="w-full mt-1 px-4 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Do (Wymeldowanie)</label>
            <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="w-full mt-1 px-4 py-2 border rounded-lg outline-none" />
          </div>
        </div>

        <button onClick={handleCheck} className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-colors">
          Sprawdź cenę i dostępność
        </button>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-lg text-sm font-medium ${isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {statusMessage}
        </div>
      )}

      {/* Podsumowanie koszyka pokazujące wybrane opcje i koszty */}
      {isAvailable && totalPrice !== null && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <h3 className="font-bold text-slate-700 text-lg border-b pb-2">Podsumowanie kosztów</h3>
          <div className="flex justify-between items-center text-xl font-bold text-emerald-600">
            <span>Do zapłaty:</span>
            <span>{totalPrice.toFixed(2)} PLN</span>
          </div>
          <button onClick={handleBook} className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-700 transition-colors shadow-md">
            Potwierdź i Rezerwuj
          </button>
        </div>
      )}
    </div>
  );
}