// Plik: Frontend/src/components/reservations/ReservationForm.jsx
import { useState, useEffect } from 'react';
import { checkAvailability, calculatePrice, createReservation } from '../../api/reservationApi';
import { getRoomTypes, getAdditionalServices } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate, toInputDate } from '../../utils/format';
import AlternativeStays from '../rooms/AlternativeStays';

// Sprawdzenie dostępności i ceny pobytu - wspólne dla przycisku "Sprawdź cenę i dostępność"
// i dla automatycznego sprawdzenia, gdy gość przychodzi z wyszukiwarki z wybranym terminem
const checkStay = async (roomTypeId, checkInDate, checkOutDate, additionalServiceIds) => {
  const avail = await checkAvailability(roomTypeId, checkInDate, checkOutDate);
  if (!avail.isAvailable) return { isAvailable: false, totalPrice: null, message: avail.message };

  const payload = {
    guestId: 0, // Ustawiane po stronie API na podstawie tokenu JWT
    roomTypeId,
    checkInDate,
    checkOutDate,
    additionalServiceIds
  };
  const priceData = await calculatePrice(payload);
  return { isAvailable: true, totalPrice: priceData.totalPrice, message: 'Pokój dostępny! Możesz dokończyć rezerwację.' };
};

export default function ReservationForm({ token, onReservationCreated, initialRoomTypeId, initialCheckIn, initialCheckOut }) {
  const [roomTypes, setRoomTypes] = useState([]);
  const [services, setServices] = useState([]);

  const [roomTypeId, setRoomTypeId] = useState(0);
  const [checkInDate, setCheckInDate] = useState(initialCheckIn ?? '');
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut ?? '');
  const [additionalServiceIds, setAdditionalServiceIds] = useState([]);
  
  const [isAvailable, setIsAvailable] = useState(null);
  const [totalPrice, setTotalPrice] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const types = await getRoomTypes();
        setRoomTypes(types);
        // Typ pokoju wybrany na stronie pokoju (przycisk "Zarezerwuj ten pokój") albo pierwszy z listy
        const preselected = types.find(rt => rt.roomTypeId === initialRoomTypeId);
        if (types.length > 0) setRoomTypeId(preselected ? preselected.roomTypeId : types[0].roomTypeId);

        const servicesData = await getAdditionalServices();
        setServices(servicesData);

        // Pokój i termin wybrane w wyszukiwarce - od razu pokazujemy dostępność i cenę, gość tylko potwierdza
        if (preselected && initialCheckIn && initialCheckOut && initialCheckIn < initialCheckOut) {
          setStatusMessage('Sprawdzanie dostępności...');
          const result = await checkStay(preselected.roomTypeId, initialCheckIn, initialCheckOut, []);
          setIsAvailable(result.isAvailable);
          setTotalPrice(result.totalPrice);
          setStatusMessage(result.message);
        }
      } catch (err) {
        setIsError(true);
        setStatusMessage(errorMessage(err));
      }
    };
    loadData();
  }, [initialRoomTypeId, initialCheckIn, initialCheckOut]);

  // Zmiana parametrów unieważnia poprzednio wyliczoną cenę - trzeba sprawdzić ponownie
  const resetCheck = () => {
    setIsError(false);
    setIsAvailable(null);
    setTotalPrice(null);
    setStatusMessage('');
  };

  const showCheckResult = (result) => {
    setIsAvailable(result.isAvailable);
    setTotalPrice(result.totalPrice);
    setStatusMessage(result.message);
  };

  const handleToggleService = async (serviceId) => {
    const newServiceIds = additionalServiceIds.includes(serviceId) ? additionalServiceIds.filter(id => id !== serviceId) : [...additionalServiceIds, serviceId];
    setAdditionalServiceIds(newServiceIds);

    // Termin i pokój już sprawdzone - zmiana usług tylko przelicza cenę, bez ponownego klikania "Sprawdź"
    if (isAvailable && totalPrice !== null) {
      try {
        showCheckResult(await checkStay(roomTypeId, checkInDate, checkOutDate, newServiceIds));
      } catch (err) {
        setIsError(true);
        setStatusMessage(errorMessage(err));
      }
    } else {
      resetCheck();
    }
  };

  // Dzisiejsza data według czasu lokalnego (toISOString liczyłby ją w UTC - po północy byłby to jeszcze poprzedni dzień)
  const today = toInputDate(new Date());

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
      setIsError(false);
      setStatusMessage('Sprawdzanie dostępności...');
      showCheckResult(await checkStay(roomTypeId, checkInDate, checkOutDate, additionalServiceIds));
    } catch (err) {
      setIsError(true);
      setStatusMessage(errorMessage(err));
    }
  };

  // Propozycja innego terminu - od razu sprawdzana dostępność i cena (z wybranymi usługami)
  const handleSelectAlternative = async (newCheckIn, newCheckOut) => {
    setCheckInDate(newCheckIn);
    setCheckOutDate(newCheckOut);
    try {
      setIsError(false);
      setStatusMessage('Sprawdzanie dostępności...');
      showCheckResult(await checkStay(roomTypeId, newCheckIn, newCheckOut, additionalServiceIds));
    } catch (err) {
      setIsError(true);
      setStatusMessage(errorMessage(err));
    }
  };

  // Krok 2: Finalizacja rezerwacji
  const handleBook = async () => {
    try {
      const payload = {
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
    } catch (err) {
      setIsError(true);
      setStatusMessage(errorMessage(err));
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
    <div className="w-full max-w-lg p-6 md:p-8 bg-white rounded-xl shadow-lg space-y-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <input type="checkbox" checked={additionalServiceIds.includes(s.serviceId)} onChange={() => handleToggleService(s.serviceId)} className="accent-emerald-600" />
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
        <div className={`p-4 rounded-lg text-sm font-medium ${isError ? 'bg-red-100 text-red-700' : isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {statusMessage}
        </div>
      )}

      {/* Brak wolnego pokoju - propozycje innych terminów tej samej długości */}
      {isAvailable === false && !isError && (
        <AlternativeStays roomTypeId={roomTypeId} checkIn={checkInDate} checkOut={checkOutDate} onSelectStay={handleSelectAlternative} />
      )}

      {/* Podsumowanie koszyka pokazujące wybrane opcje i koszty */}
      {isAvailable && totalPrice !== null && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <h3 className="font-bold text-slate-700 text-lg border-b pb-2">Podsumowanie kosztów</h3>
          <div className="text-sm text-slate-600 space-y-1">
            <div>Pokój: <span className="font-medium text-slate-800">{roomTypes.find(rt => rt.roomTypeId === roomTypeId)?.name}</span></div>
            <div>Termin: <span className="font-medium text-slate-800">{formatDate(checkInDate)} - {formatDate(checkOutDate)}</span></div>
            <div>Usługi: <span className="font-medium text-slate-800">{additionalServiceIds.length > 0 ? services.filter(s => additionalServiceIds.includes(s.serviceId)).map(s => s.name).join(', ') : 'brak'}</span></div>
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