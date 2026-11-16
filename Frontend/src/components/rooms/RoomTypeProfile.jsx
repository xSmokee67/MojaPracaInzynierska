// Plik: Frontend/src/components/rooms/RoomTypeProfile.jsx
import { useState, useEffect } from 'react';
import { getRoomTypeDetails, photoUrl, searchRoomTypes } from '../../api/roomApi';
import { errorMessage } from '../../api/apiErrors';
import { personsLabel, roomsLabel, reviewsLabel, nightsLabel, formatDate } from '../../utils/format';
import RoomPhotoPlaceholder from '../common/RoomPhotoPlaceholder';
import NotFound from '../common/NotFound';
import Alert from '../common/Alert';
import StarRating from '../common/StarRating';
import RoomAvailabilityCalendar from './RoomAvailabilityCalendar';
import AlternativeStays from './AlternativeStays';

// Profil typu pokoju: galeria zdjęć, opis, ceny, kalendarz dostępności, udogodnienia, opinie i przycisk rezerwacji
// canBook = false dla właściciela - przegląda stronę jak gość, ale rezerwacji dokonują tylko goście
// onSearch - termin wybrany w kalendarzu staje się wyszukiwaniem (to samo co na stronie głównej)
export default function RoomTypeProfile({ roomTypeId, search, canBook, onBook, onSearch, onBack }) {
  const [room, setRoom] = useState(null);
  const [stay, setStay] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getRoomTypeDetails(roomTypeId);
        setRoom(data);
        setActivePhoto(0);
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [roomTypeId]);

  // Termin z wyszukiwarki albo z kalendarza - dostępność i cena całego pobytu (osobno, żeby wybór terminu nie przeładowywał galerii)
  useEffect(() => {
    if (!search) return;
    const loadStay = async () => {
      try {
        const results = await searchRoomTypes(search);
        setStay(results.find(r => r.roomTypeId === roomTypeId) ?? null);
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadStay();
  }, [roomTypeId, search]);

  // Liczba gości z wyszukiwarki, a bez niej 2 osoby (albo mniej, jeśli pokój jest mniejszy)
  const handleSelectStay = (checkIn, checkOut) => onSearch({ checkIn, checkOut, guests: search?.guests ?? Math.min(2, room.maxOccupancy) });

  const photoCount = room?.photos.length ?? 0;
  const showPrevious = () => setActivePhoto(prev => (prev - 1 + photoCount) % photoCount);
  const showNext = () => setActivePhoto(prev => (prev + 1) % photoCount);

  // Pokój nie istnieje (np. stary link #/pokoj/999) albo nie udało się go wczytać
  if (!room && error) {
    return <NotFound title="Nie znaleziono pokoju" message="Ten pokój nie istnieje albo został wycofany z oferty. Sprawdź pozostałe pokoje na stronie głównej." onHome={onBack} />;
  }

  // Galeria: duże zdjęcie (z przewijaniem) i do czterech kolejnych obok; kliknięcie małego zdjęcia przenosi je na duże
  const sidePhotos = room ? room.photos.map((photo, i) => ({ photo, i })).filter(p => p.i !== activePhoto).slice(0, 4) : [];
  const stayFits = search && stay && stay.isAvailable && stay.fitsGuests;

  return (
    <div className="w-full max-w-page space-y-6">
      <nav aria-label="Okruszki" className="flex flex-wrap gap-2 text-sm text-slate-500">
        <button type="button" onClick={onBack} className="hover:text-brass-700 hover:underline">← Wszystkie pokoje</button>
        {room && <><span aria-hidden="true">/</span><span>{room.name}</span></>}
      </nav>

      {error && <Alert type="error" message={error} />}

      {room && (
        <>
          {/* --- NAZWA, PARAMETRY I CENA --- */}
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-medium leading-tight">{room.name}</h1>
              <p className="text-slate-500">
                do {personsLabel(room.maxOccupancy)}{room.area > 0 && ` · ${room.area} m²`} · w hotelu {roomsLabel(room.roomCount)} tego typu
                {room.averageRating !== null && (
                  <span className="whitespace-nowrap"> · <StarRating rating={room.averageRating} /> <span className="font-semibold text-navy-900">{room.averageRating.toLocaleString('pl-PL', { minimumFractionDigits: 1 })}</span> ({reviewsLabel(room.reviewCount)})</span>
                )}
              </p>
            </div>
            <p className="text-slate-500">od <span className="font-display text-3xl font-semibold text-navy-900">{room.basePrice} zł</span> / noc</p>
          </div>

          {/* --- GALERIA --- */}
          <div className={`grid gap-2.5 rounded-2xl overflow-hidden ${sidePhotos.length > 0 ? 'md:grid-cols-4 md:grid-rows-2 md:h-[28rem]' : ''}`}>
            <div className={`relative bg-sand-100 aspect-[16/10] md:aspect-auto ${sidePhotos.length > 0 ? 'md:col-span-2 md:row-span-2' : 'md:h-[28rem]'}`}>
              {photoCount > 0
                ? <img src={photoUrl(room.photos[activePhoto].photoUrl)} alt={`${room.name} - zdjęcie ${activePhoto + 1} z ${photoCount}`} className="w-full h-full object-cover" />
                : <RoomPhotoPlaceholder />}
              {photoCount > 1 && (
                <>
                  <button type="button" onClick={showPrevious} aria-label="Poprzednie zdjęcie" className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 text-navy-900 text-2xl shadow hover:bg-white">‹</button>
                  <button type="button" onClick={showNext} aria-label="Następne zdjęcie" className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 text-navy-900 text-2xl shadow hover:bg-white">›</button>
                  <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-white/95 text-navy-900 text-xs font-semibold">{activePhoto + 1} / {photoCount}</span>
                </>
              )}
            </div>
            {sidePhotos.map(({ photo, i }) => (
              <button key={photo.roomTypePhotoId} type="button" onClick={() => setActivePhoto(i)} aria-label={`Pokaż zdjęcie ${i + 1}`}
                className="hidden md:block relative overflow-hidden bg-sand-100 group">
                <img src={photoUrl(photo.photoUrl)} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-10 lg:gap-12 items-start pt-4">
            {/* --- OPIS, UDOGODNIENIA, KALENDARZ, OPINIE --- */}
            <div className="flex-[999_1_34rem] min-w-0 space-y-10">
              <section className="space-y-3">
                <h2 className="text-2xl md:text-[1.75rem] font-medium">O pokoju</h2>
                <p className="text-[17px] text-slate-600 leading-relaxed whitespace-pre-line">{room.description || 'Opis pokoju zostanie wkrótce uzupełniony.'}</p>
              </section>

              {room.amenities.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-2xl md:text-[1.75rem] font-medium">Udogodnienia</h2>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-x-6 gap-y-3">
                    {room.amenities.map(a => <li key={a} className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-brass-500 shrink-0" aria-hidden="true" />{a}</li>)}
                  </ul>
                </section>
              )}

              {/* Kalendarz dostępności - wybór terminu */}
              <section className="space-y-4">
                <div className="flex flex-wrap justify-between items-baseline gap-2">
                  <h2 className="text-2xl md:text-[1.75rem] font-medium">Dostępność</h2>
                  <p className="text-sm text-slate-500">Kliknij dzień przyjazdu, potem dzień wyjazdu</p>
                </div>
                <RoomAvailabilityCalendar key={roomTypeId} roomTypeId={roomTypeId} checkIn={search?.checkIn} checkOut={search?.checkOut} onSelectStay={handleSelectStay} />
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl md:text-[1.75rem] font-medium">Opinie gości</h2>
                {room.latestReviews.map(r => (
                  <div key={r.reviewId} className="border-b border-sand-200 pb-4 space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">{r.guestName}</span>
                      <StarRating rating={r.rating} />
                    </div>
                    {r.comment && <p className="text-slate-600 leading-relaxed">{r.comment}</p>}
                    <div className="text-xs text-slate-500">{formatDate(r.date)}</div>
                  </div>
                ))}
                {room.reviewCount === 0 && <p className="p-5 rounded-2xl bg-sand-100 text-slate-600 leading-relaxed">Ten pokój nie ma jeszcze opinii. Opinię może dodać gość po zakończonym pobycie - z zakładki „Moje rezerwacje”.</p>}
              </section>
            </div>

            {/* --- PUDEŁKO REZERWACJI --- */}
            <aside className="flex-[1_1_20rem] w-full lg:max-w-sm lg:sticky lg:top-6 card shadow-[0_12px_40px_rgb(20_33_61_/_0.10)] p-6 space-y-4">
              <p className="text-slate-500"><span className="font-display text-3xl font-semibold text-navy-900">{room.basePrice} zł</span> / noc</p>

              {/* Wybrany termin (z kalendarza albo z wyszukiwarki na stronie głównej) */}
              {search ? (
                <div className="grid grid-cols-2 rounded-xl border border-slate-300 overflow-hidden text-[15px] font-medium">
                  <div className="px-4 py-2.5 border-r border-slate-300"><span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Przyjazd</span>{formatDate(search.checkIn)}</div>
                  <div className="px-4 py-2.5"><span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Wyjazd</span>{formatDate(search.checkOut)}</div>
                  <div className="col-span-2 px-4 py-2.5 border-t border-slate-300"><span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Goście</span>{personsLabel(search.guests)}</div>
                </div>
              ) : (
                <p className="p-4 rounded-xl bg-sand-100 text-sm text-slate-600">Wybierz w kalendarzu dzień przyjazdu i wyjazdu, aby zobaczyć cenę całego pobytu.</p>
              )}

              {search && stay && (
                !stay.fitsGuests
                  ? <span className="inline-block px-3 py-1.5 rounded-full bg-warning-50 text-warning-700 text-sm font-semibold">Ten pokój mieści maksymalnie {personsLabel(room.maxOccupancy)}</span>
                  : stay.isAvailable
                    ? <span className="inline-block px-3 py-1.5 rounded-full bg-success-50 text-success-700 text-sm font-semibold">{stay.availableRooms === 1 ? 'Ostatni wolny pokój w tym terminie' : 'Pokój wolny w tym terminie'}</span>
                    : (
                      <div className="space-y-3">
                        <span className="inline-block px-3 py-1.5 rounded-full bg-danger-50 text-danger-700 text-sm font-semibold">Brak wolnego pokoju na cały termin</span>
                        <AlternativeStays roomTypeId={roomTypeId} checkIn={search.checkIn} checkOut={search.checkOut} onSelectStay={handleSelectStay} />
                      </div>
                    )
              )}

              {canBook ? (
                <button type="button" onClick={() => onBook(room.roomTypeId)} disabled={stay !== null && (!stay.isAvailable || !stay.fitsGuests)} className="btn-primary w-full py-4">
                  {search && stay?.isAvailable ? 'Zarezerwuj ten termin' : 'Zarezerwuj ten pokój'}
                </button>
              ) : (
                <p className="p-3 rounded-xl bg-sand-100 text-sm text-slate-600 text-center">Podgląd jako właściciel - rezerwacji dokonują goście.</p>
              )}

              {stayFits && (
                <div className="border-t border-sand-200 pt-4 space-y-2 text-[15px] text-slate-600">
                  <div className="flex justify-between gap-3"><span>Nocleg: {nightsLabel(stay.nights)}</span><span>{stay.totalPrice} zł</span></div>
                  <div className="flex justify-between gap-3 text-[17px] font-bold text-navy-900"><span>Razem</span><span>{stay.totalPrice} zł</span></div>
                </div>
              )}

              {room.seasonalPrices.length > 0 && (
                <div className="p-4 rounded-xl bg-sand-100 text-sm space-y-1">
                  <div className="eyebrow">Ceny sezonowe</div>
                  {room.seasonalPrices.map(p => (
                    <div key={p.priceListEntryId} className="flex justify-between gap-4">
                      <span>{formatDate(p.startDate)} - {formatDate(p.endDate)}</span>
                      <span className="font-semibold">{p.pricePerNight} zł / noc</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[13px] leading-normal text-slate-500">Bezpłatne anulowanie do 7 dni przed przyjazdem, później opłata 30% ceny pobytu. Usługi dodatkowe wybierzesz w następnym kroku.</p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
