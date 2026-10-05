// Plik: Frontend/src/components/RoomTypeProfile.tsx
import { useState, useEffect } from 'react';
import type { RoomTypeDetailsDto, RoomTypeAvailabilityDto, SearchCriteria } from '../types/room';
import { getRoomTypeDetails, photoUrl, searchRoomTypes } from '../api/roomApi';
import { errorMessage } from '../api/apiErrors';
import { personsLabel, roomsLabel, reviewsLabel, nightsLabel, formatDate } from '../utils/format';
import RoomPhotoPlaceholder from './RoomPhotoPlaceholder';
import NotFound from './NotFound';
import Alert from './Alert';
import StarRating from './StarRating';

// Profil typu pokoju: galeria zdjęć, opis, ceny, udogodnienia, opinie i przycisk rezerwacji
// canBook = false dla właściciela - przegląda stronę jak gość, ale rezerwacji dokonują tylko goście
export default function RoomTypeProfile({ roomTypeId, search, canBook, onBook, onBack }: { roomTypeId: number; search: SearchCriteria | null; canBook: boolean; onBook: (roomTypeId: number) => void; onBack: () => void }) {
  const [room, setRoom] = useState<RoomTypeDetailsDto | null>(null);
  const [stay, setStay] = useState<RoomTypeAvailabilityDto | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getRoomTypeDetails(roomTypeId);
        setRoom(data);
        setActivePhoto(0);

        // Termin wybrany w wyszukiwarce na stronie głównej - dostępność i cena całego pobytu
        if (search) {
          const results = await searchRoomTypes(search);
          setStay(results.find(r => r.roomTypeId === roomTypeId) ?? null);
        }
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [roomTypeId, search]);

  const photoCount = room?.photos.length ?? 0;
  const showPrevious = () => setActivePhoto(prev => (prev - 1 + photoCount) % photoCount);
  const showNext = () => setActivePhoto(prev => (prev + 1) % photoCount);

  // Pokój nie istnieje (np. stary link #/pokoj/999) albo nie udało się go wczytać
  if (!room && error) {
    return <NotFound title="Nie znaleziono pokoju" message="Ten pokój nie istnieje albo został wycofany z oferty. Sprawdź pozostałe pokoje na stronie głównej." onHome={onBack} />;
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-emerald-600 hover:underline">← Wszystkie pokoje</button>

      {error && <Alert type="error" message={error} />}

      {room && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* --- GALERIA --- */}
            <div className="lg:col-span-3 space-y-3 p-4">
              <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-slate-200">
                {photoCount > 0
                  ? <img src={photoUrl(room.photos[activePhoto].photoUrl)} alt={`${room.name} - zdjęcie ${activePhoto + 1} z ${photoCount}`} className="w-full h-full object-cover" />
                  : <RoomPhotoPlaceholder />}
                {photoCount > 1 && (
                  <>
                    <button type="button" onClick={showPrevious} aria-label="Poprzednie zdjęcie" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-slate-800 text-xl font-bold shadow hover:bg-white">‹</button>
                    <button type="button" onClick={showNext} aria-label="Następne zdjęcie" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-slate-800 text-xl font-bold shadow hover:bg-white">›</button>
                    <span className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-slate-900/70 text-white text-xs font-medium">{activePhoto + 1} / {photoCount}</span>
                  </>
                )}
              </div>
              {photoCount > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {room.photos.map((photo, i) => (
                    <button key={photo.roomTypePhotoId} type="button" onClick={() => setActivePhoto(i)} aria-label={`Pokaż zdjęcie ${i + 1}`}
                      className={`shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 ${i === activePhoto ? 'border-emerald-600' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                      <img src={photoUrl(photo.photoUrl)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* --- PODSUMOWANIE I REZERWACJA --- */}
            <div className="lg:col-span-2 p-6 lg:border-l border-slate-200 space-y-5">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold text-slate-800">{room.name}</h2>
                {room.averageRating !== null && (
                  <div className="text-sm text-slate-600">
                    <StarRating rating={room.averageRating} />
                    <span className="ml-2 font-semibold text-slate-800">{room.averageRating.toLocaleString('pl-PL', { minimumFractionDigits: 1 })}</span> ({reviewsLabel(room.reviewCount)})
                  </div>
                )}
              </div>

              <div className="space-y-2 text-slate-600">
                <div><span className="text-2xl font-bold text-emerald-600">{room.basePrice} PLN</span> / noc</div>
                <div>Maksymalnie <span className="font-semibold text-slate-800">{personsLabel(room.maxOccupancy)}</span></div>
                <div>W hotelu: <span className="font-semibold text-slate-800">{roomsLabel(room.roomCount)}</span> tego typu</div>
              </div>

              {room.seasonalPrices.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm space-y-1">
                  <div className="font-semibold text-amber-800">Ceny sezonowe</div>
                  {room.seasonalPrices.map(p => (
                    <div key={p.priceListEntryId} className="flex justify-between gap-4 text-amber-900">
                      <span>{formatDate(p.startDate)} - {formatDate(p.endDate)}</span>
                      <span className="font-semibold">{p.pricePerNight} PLN / noc</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Termin z wyszukiwarki na stronie głównej */}
              {search && stay ? (
                <div className={`p-3 rounded-lg border text-sm space-y-1 ${stay.isAvailable && stay.fitsGuests ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50'}`}>
                  <div className="font-semibold text-slate-800">Twój termin: {formatDate(search.checkIn)} - {formatDate(search.checkOut)}</div>
                  <div className="text-slate-600">{nightsLabel(stay.nights)} · {personsLabel(search.guests)}</div>
                  {!stay.fitsGuests
                    ? <div className="font-semibold text-amber-700">Ten pokój mieści maksymalnie {personsLabel(room.maxOccupancy)}.</div>
                    : stay.isAvailable
                      ? <div className="flex justify-between items-baseline gap-2"><span className="font-semibold text-emerald-700">Dostępny{stay.availableRooms === 1 ? ' - ostatni wolny pokój!' : ''}</span><span className="text-lg font-bold text-slate-800">{stay.totalPrice} PLN</span></div>
                      : <div className="font-semibold text-slate-700">Brak wolnych pokoi w tym terminie. Wybierz inne daty na stronie głównej.</div>}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Wybierz daty w wyszukiwarce na <button type="button" onClick={onBack} className="text-emerald-600 font-semibold hover:underline">stronie głównej</button>, aby zobaczyć cenę całego pobytu.</p>
              )}

              {canBook ? (
                <button type="button" onClick={() => onBook(room.roomTypeId)} disabled={stay !== null && (!stay.isAvailable || !stay.fitsGuests)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-700 transition-colors shadow-md disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed">
                  {search && stay?.isAvailable ? 'Zarezerwuj ten termin' : 'Zarezerwuj ten pokój'}
                </button>
              ) : (
                <p className="p-3 rounded-lg bg-slate-50 border text-sm text-slate-600 text-center">Podgląd jako właściciel - rezerwacji dokonują goście.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 border-t border-slate-200">
            {/* --- OPIS I UDOGODNIENIA --- */}
            <div className="lg:col-span-3 p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-700 text-lg">Opis pokoju</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{room.description || 'Opis pokoju zostanie wkrótce uzupełniony.'}</p>
              </div>
              {room.amenities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-700 text-lg">Udogodnienia</h3>
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.map(a => <span key={a} className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-sm font-medium">{a}</span>)}
                  </div>
                </div>
              )}
            </div>

            {/* --- OPINIE --- */}
            <div className="lg:col-span-2 p-6 lg:border-l border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-700 text-lg">Opinie gości</h3>
              {room.latestReviews.map(r => (
                <div key={r.reviewId} className="p-3 rounded-lg bg-slate-50 border space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-semibold text-slate-800">{r.guestName}</span>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
                  <div className="text-xs text-slate-500">{formatDate(r.date!)}</div>
                </div>
              ))}
              {room.reviewCount === 0 && <p className="text-sm text-slate-500">Ten pokój nie ma jeszcze opinii.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}