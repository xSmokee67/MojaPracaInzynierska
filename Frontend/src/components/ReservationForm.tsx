// Plik: Frontend/src/components/ReservationForm.tsx
import { useState, useEffect } from 'react';
import type { CreateReservationDto } from '../types/reservation';
import type { RoomTypeDto, AdditionalServiceDto } from '../types/admin';
import { checkAvailability, calculatePrice, createReservation } from '../api/reservationApi';
import { getRoomTypes, getAdditionalServices } from '../api/adminApi';

export default function ReservationForm({ token, onReservationCreated }: { token: string; onReservationCreated: () => void }) {
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [services, setServices] = useState<AdditionalServiceDto[]>([]);

  const [roomTypeId, setRoomTypeId] = useState<number>(0);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [additionalServiceIds, setAdditionalServiceIds] = useState<number[]>([]);
  
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const loadData = async () => {
    try {
      const types = await getRoomTypes();
      setRoomTypes(types);
      if (types.length > 0) setRoomTypeId(types[0].roomTypeId!);

      const servicesData = await getAdditionalServices();
      setServices(servicesData);
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Zmiana parametrów unieważnia poprzednio wyliczoną cenę - trzeba sprawdzić ponownie
  const resetCheck = () => {
    setIsAvailable(null);
    setTotalPrice(null);
    setStatusMessage('');
  };

  const handleToggleService = (serviceId: number) => {
    setAdditionalServiceIds(prev => prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]);
    resetCheck();
  };

  const today = new Date().toISOString().slice(0, 10);

  // Krok 1: Weryfikacja i kalkulacja
  const handleCheck = async () => {
    if (!checkInDate || !checkOutDate) {
      setStatusMessage('Wybierz najpierw daty pobytu.');
      return;
    }

    if (checkInDate >= checkOutDate) {
      setStatusMessage('Data wymeldowania musi być późniejsza niż data zameldowania.');
      return;
    }
    
    try {
      setStatusMessage('Sprawdzanie dostępności...');
      const avail = await checkAvailability(roomTypeId, checkInDate, checkOutDate);
      setIsAvailable(avail.isAvailable);
      
      if (avail.isAvailable) {
        const payload: CreateReservationDto = {
          guestId: 0, // Ustawiane po stronie API na podstawie tokenu JWT
          roomTypeId,
          checkInDate,
          checkOutDate,
          additionalServiceIds
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
        guestId: 0,
        roomTypeId,
        checkInDate,
        checkOutDate,
        additionalServiceIds
      };
      await createReservation(payload, token);
      setIsSuccess(true);
      setAdditionalServiceIds([]);
      resetCheck();
      onReservationCreated();
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
        <button onClick={() => { setIsSuccess(false); setStatusMessage(''); }} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
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
            onChange={(e) => { setRoomTypeId(Number(e.target.value)); resetCheck(); }}
            className="w-full mt-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {roomTypes.map(rt => <option key={rt.roomTypeId} value={rt.roomTypeId}>{rt.name} (od {rt.basePrice} PLN/noc, max {rt.maxOccupancy} os.)</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Od (Zameldowanie)</label>
            <input type="date" min={today} value={checkInDate} onChange={(e) => { setCheckInDate(e.target.value); resetCheck(); }} className="w-full mt-1 px-4 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Do (Wymeldowanie)</label>
            <input type="date" min={checkInDate || today} value={checkOutDate} onChange={(e) => { setCheckOutDate(e.target.value); resetCheck(); }} className="w-full mt-1 px-4 py-2 border rounded-lg outline-none" />
          </div>
        </div>

        {services.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Usługi dodatkowe</label>
            <div className="mt-2 space-y-2">
              {services.map(s => (
                <label key={s.serviceId} className="flex items-center justify-between px-4 py-2 border rounded-lg text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={additionalServiceIds.includes(s.serviceId!)} onChange={() => handleToggleService(s.serviceId!)} className="accent-emerald-600" />
                    {s.name}
                  </span>
                  <span className="font-medium text-slate-500">+{s.price} PLN</span>
                </label>
              ))}
            </div>
          </div>
        )}

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
          <div className="text-sm text-slate-600 space-y-1">
            <div>Pokój: <span className="font-medium text-slate-800">{roomTypes.find(rt => rt.roomTypeId === roomTypeId)?.name}</span></div>
            <div>Termin: <span className="font-medium text-slate-800">{new Date(checkInDate).toLocaleDateString()} - {new Date(checkOutDate).toLocaleDateString()}</span></div>
            <div>Usługi: <span className="font-medium text-slate-800">{additionalServiceIds.length > 0 ? services.filter(s => additionalServiceIds.includes(s.serviceId!)).map(s => s.name).join(', ') : 'brak'}</span></div>
          </div>
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