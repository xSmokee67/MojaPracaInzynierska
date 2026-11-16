// Plik: Frontend/src/components/reservations/ReservationForm.jsx
import { useState, useEffect } from 'react';
import { checkAvailability, calculatePrice, createReservation, getMyReservations } from '../../api/reservationApi';
import { getRoomTypes, getAdditionalServices } from '../../api/adminApi';
import { photoUrl } from '../../api/roomApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate, toInputDate, personsLabel, nightsLabel } from '../../utils/format';
import AlternativeStays from '../rooms/AlternativeStays';
import RoomPhotoPlaceholder from '../common/RoomPhotoPlaceholder';
import OnlinePayment from './OnlinePayment';
import { serviceChargeTypeLabels, serviceQuantity } from '../../utils/statuses';

// Sprawdzenie dostępności i ceny pobytu - wspólne dla przycisku "Sprawdź cenę i dostępność"
// i dla automatycznego sprawdzenia, gdy gość przychodzi z wyszukiwarki z wybranym terminem
// Liczba gości jest potrzebna do ceny usług naliczanych za osobę (np. śniadanie)
const checkStay = async (roomTypeId, checkInDate, checkOutDate, additionalServiceIds, numberOfGuests) => {
  const avail = await checkAvailability(roomTypeId, checkInDate, checkOutDate);
  if (!avail.isAvailable) return { isAvailable: false, totalPrice: null, message: avail.message };

  const payload = {
    guestId: 0, // Ustawiane po stronie API na podstawie tokenu JWT
    roomTypeId,
    checkInDate,
    checkOutDate,
    numberOfGuests,
    additionalServiceIds
  };
  const priceData = await calculatePrice(payload);
  return { isAvailable: true, totalPrice: priceData.totalPrice, message: 'Pokój dostępny! Możesz dokończyć rezerwację.' };
};

// Formularz rezerwacji: termin i pokój, usługi dodatkowe i podsumowanie ceny obok (onNavigate - powrót do pokoju, przejście do "Moich rezerwacji")
export default function ReservationForm({ token, onReservationCreated, onNavigate, initialRoomTypeId, initialCheckIn, initialCheckOut, initialGuests }) {
  const [roomTypes, setRoomTypes] = useState([]);
  const [services, setServices] = useState([]);

  const [roomTypeId, setRoomTypeId] = useState(0);
  // Liczba gości z wyszukiwarki; bez wyszukiwania ustawiana po wczytaniu pokoi (2 osoby albo mniej, jeśli pokój jest mniejszy)
  const [numberOfGuests, setNumberOfGuests] = useState(initialGuests ?? null);
  const [checkInDate, setCheckInDate] = useState(initialCheckIn ?? '');
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut ?? '');
  const [additionalServiceIds, setAdditionalServiceIds] = useState([]);
  
  const [isAvailable, setIsAvailable] = useState(null);
  const [totalPrice, setTotalPrice] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  // Złożona rezerwacja (numer i cena) - do płatności online od razu po rezerwacji
  const [createdReservation, setCreatedReservation] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const types = await getRoomTypes();
        setRoomTypes(types);
        // Typ pokoju wybrany na stronie pokoju (przycisk "Zarezerwuj ten pokój") albo pierwszy z listy
        const preselected = types.find(rt => rt.roomTypeId === initialRoomTypeId);
        const selected = preselected ?? types[0];
        if (selected) setRoomTypeId(selected.roomTypeId);
        const guests = initialGuests ?? (selected ? Math.min(2, selected.maxOccupancy) : 1);
        if (initialGuests == null) setNumberOfGuests(guests);

        // Gościom proponujemy tylko usługi dostępne w ofercie (wycofane zostają w historii rezerwacji)
        const servicesData = await getAdditionalServices();
        setServices(servicesData.filter(s => s.isActive));

        // Pokój i termin wybrane w wyszukiwarce - od razu pokazujemy dostępność i cenę, gość tylko potwierdza
        // (o ile pokój mieści tylu gości, ilu wybrano w wyszukiwarce)
        const fits = initialGuests == null || (preselected && initialGuests <= preselected.maxOccupancy);
        if (preselected && fits && initialCheckIn && initialCheckOut && initialCheckIn < initialCheckOut) {
          setStatusMessage('Sprawdzanie dostępności...');
          const result = await checkStay(preselected.roomTypeId, initialCheckIn, initialCheckOut, [], guests);
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
  }, [initialRoomTypeId, initialCheckIn, initialCheckOut, initialGuests]);

  const selectedRoomType = roomTypes.find(rt => rt.roomTypeId === roomTypeId);
  // Pokój musi pomieścić wszystkich gości - tę samą regułę sprawdza API przy tworzeniu rezerwacji
  const fitsGuests = !selectedRoomType || numberOfGuests === null || numberOfGuests <= selectedRoomType.maxOccupancy;
  // Liczba nocy w wybranym terminie - do rozpisania ceny usług w podsumowaniu
  const nights = checkInDate && checkOutDate && checkInDate < checkOutDate
    ? Math.round((new Date(`${checkOutDate}T00:00:00`) - new Date(`${checkInDate}T00:00:00`)) / 86400000) : 0;
  // Lista liczby gości: do największego pokoju w hotelu (co najmniej 4, jak w wyszukiwarce)
  const maxGuests = Math.max(4, ...roomTypes.map(rt => rt.maxOccupancy));

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
        showCheckResult(await checkStay(roomTypeId, checkInDate, checkOutDate, newServiceIds, numberOfGuests));
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

    if (!fitsGuests) {
      setStatusMessage(`Ten pokój mieści maksymalnie ${personsLabel(selectedRoomType.maxOccupancy)}. Wybierz większy pokój.`);
      return;
    }

    try {
      setIsError(false);
      setStatusMessage('Sprawdzanie dostępności...');
      showCheckResult(await checkStay(roomTypeId, checkInDate, checkOutDate, additionalServiceIds, numberOfGuests));
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
      showCheckResult(await checkStay(roomTypeId, newCheckIn, newCheckOut, additionalServiceIds, numberOfGuests));
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
        numberOfGuests,
        additionalServiceIds
      };
      const result = await createReservation(payload, token);
      // Numer nowej rezerwacji - najnowsza na liście gościa (API przy tworzeniu zwraca tylko komunikat)
      try {
        const mine = await getMyReservations(token);
        setCreatedReservation(mine.reduce((newest, r) => (!newest || r.reservationId > newest.reservationId ? r : newest), null));
      } catch {
        setCreatedReservation(null); // bez numeru gość zapłaci z "Moich rezerwacji"
      }
      setIsPaid(false);
      setIsSuccess(true);
      setAdditionalServiceIds([]);
      resetCheck();
      onReservationCreated();
      // Komunikat z API zawiera termin płatności
      setStatusMessage(result?.message ?? 'Rezerwacja została złożona.');
    } catch (err) {
      setIsError(true);
      setStatusMessage(errorMessage(err));
    }
  };

  // Usługi wybrane przez gościa z liczbą naliczeń, np. "Śniadanie: 8 × 50 zł" - do kart usług i podsumowania
  const servicesTotal = (s) => serviceQuantity(s.chargeType, nights, numberOfGuests ?? 1) * s.price;
  const selectedServices = services.filter(s => additionalServiceIds.includes(s.serviceId));
  const selectedServicesSum = selectedServices.reduce((sum, s) => sum + servicesTotal(s), 0);
  const isChecked = isAvailable && totalPrice !== null;

  // Kroki rezerwacji nad formularzem: termin sprawdzony -> usługi -> potwierdzenie
  const steps = [
    { label: 'Termin i pokój', done: isChecked },
    { label: 'Usługi dodatkowe', done: false },
    { label: 'Potwierdzenie', done: false }
  ];
  const currentStep = isChecked ? 1 : 0;

  if (isSuccess) {
    return (
      <div className="w-full max-w-xl py-10 md:py-16 text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-full bg-success-50 text-success-700 text-3xl flex items-center justify-center" aria-hidden="true">✓</div>
        <h1 className="text-3xl md:text-4xl font-medium">{isPaid ? 'Rezerwacja opłacona' : 'Rezerwacja złożona'}</h1>
        <p className="text-slate-600 leading-relaxed">{statusMessage}</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {/* Płatność online od razu po rezerwacji - opłacona rezerwacja jest potwierdzona */}
          {createdReservation && !isPaid && <button onClick={() => setShowPayment(true)} className="btn-primary">Zapłać teraz {createdReservation.totalPrice.toFixed(2)} zł</button>}
          <button onClick={() => onNavigate(createdReservation ? `/moje-rezerwacje/${createdReservation.reservationId}` : '/moje-rezerwacje')} className={createdReservation && !isPaid ? 'btn-outline' : 'btn-primary'}>
            {isPaid ? 'Zobacz rezerwację' : createdReservation ? 'Zapłacę później' : 'Przejdź do moich rezerwacji'}
          </button>
          {isPaid && <button onClick={() => { setIsSuccess(false); setStatusMessage(''); setCreatedReservation(null); }} className="btn-outline">Złóż kolejną rezerwację</button>}
        </div>
        {showPayment && createdReservation && (
          <OnlinePayment token={token} reservationId={createdReservation.reservationId} amount={createdReservation.totalPrice}
            onPaid={text => { setShowPayment(false); setIsPaid(true); setStatusMessage(text); onReservationCreated(); }} onClose={() => setShowPayment(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-page">
      {selectedRoomType && <button type="button" onClick={() => onNavigate(`/pokoj/${selectedRoomType.roomTypeId}`)} className="text-sm text-slate-500 hover:text-brass-700 hover:underline">← Wróć do pokoju</button>}
      <h1 className="mt-3 text-4xl md:text-[2.75rem] font-medium">Twoja rezerwacja</h1>

      <ol className="flex flex-wrap items-center gap-2.5 mt-5 mb-8 text-sm font-semibold">
        {steps.map((step, i) => (
          <li key={step.label} className={`flex items-center gap-2 ${step.done ? 'text-success-700' : i === currentStep ? 'text-navy-900' : 'text-slate-400'}`}>
            {i > 0 && <span className="mr-0.5 text-slate-300" aria-hidden="true">—</span>}
            <span className={`w-[26px] h-[26px] rounded-full flex items-center justify-center ${step.done ? 'bg-success-50' : i === currentStep ? 'bg-navy-900 text-white' : 'border border-slate-300'}`}>{step.done ? '✓' : i + 1}</span>
            {step.label}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-10 items-start">
        <div className="flex-[999_1_35rem] min-w-0 space-y-8">
          {/* --- TERMIN I POKÓJ --- */}
          <section className="card overflow-hidden flex flex-wrap">
            <div className="flex-[1_1_12rem] sm:max-w-60 min-h-40 bg-sand-100">
              {selectedRoomType?.mainPhotoUrl
                ? <img src={photoUrl(selectedRoomType.mainPhotoUrl)} alt={selectedRoomType.name} className="w-full h-full object-cover" />
                : <RoomPhotoPlaceholder />}
            </div>
            <div className="flex-[999_1_20rem] p-5 md:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="field-label sm:col-span-2">Typ pokoju
                  <select value={roomTypeId} onChange={(e) => { setRoomTypeId(Number(e.target.value)); resetCheck(); }} className="field font-normal">
                    {roomTypes.map(rt => (
                      // Pokoje za małe dla wybranej liczby gości są nieaktywne
                      <option key={rt.roomTypeId} value={rt.roomTypeId} disabled={numberOfGuests !== null && rt.maxOccupancy < numberOfGuests}>
                        {rt.name} (od {rt.basePrice} zł/noc, max {rt.maxOccupancy} os.){numberOfGuests !== null && rt.maxOccupancy < numberOfGuests ? ' - za mały' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">Przyjazd
                  <input type="date" min={today} value={checkInDate} onChange={(e) => { setCheckInDate(e.target.value); resetCheck(); }} className="field font-normal" />
                </label>
                <label className="field-label">Wyjazd
                  <input type="date" min={checkInDate || today} value={checkOutDate} onChange={(e) => { setCheckOutDate(e.target.value); resetCheck(); }} className="field font-normal" />
                </label>
                <label className="field-label">Liczba gości
                  <select value={numberOfGuests ?? ''} onChange={(e) => { setNumberOfGuests(Number(e.target.value)); resetCheck(); }} className="field font-normal">
                    {Array.from({ length: maxGuests }, (_, i) => i + 1).map(n => <option key={n} value={n}>{personsLabel(n)}</option>)}
                  </select>
                </label>
                <div className="flex items-end">
                  <button onClick={handleCheck} disabled={!fitsGuests} className="btn-outline w-full">Sprawdź cenę i dostępność</button>
                </div>
              </div>
              {!fitsGuests && (
                <p className="text-sm font-medium text-warning-700">
                  Ten pokój mieści maksymalnie {personsLabel(selectedRoomType.maxOccupancy)}. Wybierz większy pokój albo zmniejsz liczbę gości.
                </p>
              )}
              {statusMessage && (
                <p className={`text-sm font-semibold ${isError ? 'text-danger-700' : isAvailable ? 'text-success-700' : 'text-warning-700'}`}>{statusMessage}</p>
              )}
              {/* Brak wolnego pokoju - propozycje innych terminów tej samej długości */}
              {isAvailable === false && !isError && (
                <AlternativeStays roomTypeId={roomTypeId} checkIn={checkInDate} checkOut={checkOutDate} onSelectStay={handleSelectAlternative} />
              )}
            </div>
          </section>

          {/* --- USŁUGI DODATKOWE --- */}
          {services.length > 0 && (
            <section className="space-y-3.5">
              <div>
                <h2 className="text-2xl md:text-[1.75rem] font-medium">Usługi dodatkowe</h2>
                <p className="mt-1.5 text-[15px] text-slate-500">Opcjonalne - cena liczy się od razu według liczby nocy i osób.</p>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
                {services.map(s => {
                  const selected = additionalServiceIds.includes(s.serviceId);
                  return (
                    <label key={s.serviceId} className={`flex items-start gap-3.5 p-4 rounded-[14px] bg-white cursor-pointer transition-colors ${selected ? 'border-2 border-navy-900' : 'border border-slate-300 m-px hover:border-navy-900'}`}>
                      <input type="checkbox" checked={selected} onChange={() => handleToggleService(s.serviceId)} className="mt-0.5 w-5 h-5 shrink-0 accent-navy-900" />
                      <span className="min-w-0 flex flex-col gap-1">
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-sm text-slate-500">{s.price} zł {serviceChargeTypeLabels[s.chargeType] ?? ''}</span>
                      </span>
                      {selected && nights > 0 && <span className="ml-auto text-[15px] font-semibold whitespace-nowrap">+{servicesTotal(s).toFixed(0)} zł</span>}
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          <section className="p-5 rounded-[14px] bg-sand-100 text-[15px] leading-relaxed text-slate-600">
            <strong className="text-navy-900">Zasady anulowania.</strong> Rezerwację anulujesz bezpłatnie do 7 dni przed przyjazdem. Później opłata wynosi 30% ceny pobytu, a resztę wpłaty zwracamy.
          </section>
        </div>

        {/* --- PODSUMOWANIE --- */}
        <aside className="flex-[1_1_20rem] w-full lg:max-w-sm lg:sticky lg:top-6 card shadow-[0_12px_40px_rgb(20_33_61_/_0.10)] p-6 space-y-4">
          <h2 className="text-2xl font-medium">Podsumowanie</h2>
          <div className="text-[15px] text-slate-600 space-y-1">
            <div className="font-semibold text-navy-900">{selectedRoomType?.name}</div>
            {nights > 0 && <div>{formatDate(checkInDate)} - {formatDate(checkOutDate)} · {nightsLabel(nights)}</div>}
            {numberOfGuests !== null && <div>{personsLabel(numberOfGuests)}</div>}
          </div>

          {isChecked ? (
            <>
              <div className="border-t border-sand-200 pt-4 space-y-2.5 text-[15px] text-slate-600">
                <div className="flex justify-between gap-3"><span>Nocleg: {nightsLabel(nights)}</span><span>{(totalPrice - selectedServicesSum).toFixed(0)} zł</span></div>
                {/* Każda usługa z liczbą naliczeń, np. "Śniadanie: 8 × 50 zł" */}
                {selectedServices.map(s => (
                  <div key={s.serviceId} className="flex justify-between gap-3">
                    <span>{s.name}: {serviceQuantity(s.chargeType, nights, numberOfGuests)} × {s.price} zł</span>
                    <span className="whitespace-nowrap">{servicesTotal(s).toFixed(0)} zł</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-baseline border-t border-sand-200 pt-3.5">
                <span className="font-bold">Do zapłaty</span>
                <span className="font-display text-3xl font-semibold">{totalPrice.toFixed(2)} zł</span>
              </div>
              <p className="text-[13px] text-slate-500">Płatność na miejscu albo przelewem - hotel zapisze wpłatę w Twojej rezerwacji.</p>
              <button onClick={handleBook} className="btn-primary w-full py-4">Potwierdź rezerwację</button>
            </>
          ) : (
            <p className="p-4 rounded-xl bg-sand-100 text-sm text-slate-600">Wybierz termin i kliknij „Sprawdź cenę i dostępność” - tu pojawi się cena całego pobytu z usługami.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
