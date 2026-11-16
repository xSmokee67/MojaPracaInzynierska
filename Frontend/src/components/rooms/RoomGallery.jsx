// Plik: Frontend/src/components/rooms/RoomGallery.jsx
import { useState, useEffect } from 'react';
import { getRoomTypes } from '../../api/adminApi';
import { photoUrl, searchRoomTypes } from '../../api/roomApi';
import { errorMessage } from '../../api/apiErrors';
import { personsLabel, reviewsLabel, nightsLabel, formatDate, toInputDate, addDaysToInputDate } from '../../utils/format';
import RoomPhotoPlaceholder from '../common/RoomPhotoPlaceholder';
import Alert from '../common/Alert';
import StarRating from '../common/StarRating';
import AlternativeStays from './AlternativeStays';

// Sortowanie kafelków na stronie głównej
const sortLabels = {
  recommended: 'Polecane',
  priceAsc: 'Cena rosnąco',
  priceDesc: 'Cena malejąco',
  rating: 'Ocena gości',
  capacity: 'Liczba osób'
};

// Sortowanie i filtry pamiętane w sesji przeglądarki - zostają po powrocie z profilu pokoju
const FILTERS_STORAGE_KEY = 'hotel_filters';
const defaultFilters = { sort: 'recommended', amenities: [], onlyAvailable: false };
const loadFilters = () => {
  try {
    const saved = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
  } catch {
    return defaultFilters;
  }
};

// Strona główna: zdjęcie hotelu z wyszukiwarką, a pod nią kafelki typów pokoi (bez wyszukiwania)
// albo lista wyników z ceną całego pobytu (po wyszukiwaniu); filtry zawsze w kolumnie po lewej. Kliknięcie pokoju otwiera jego profil
export default function RoomGallery({ search, onSearch, onClearSearch, onSelect }) {
  const [roomTypes, setRoomTypes] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Stan formularza wyszukiwarki (domyślnie: jutro, 2 noce, 2 osoby)
  const today = toInputDate(new Date());
  const [checkIn, setCheckIn] = useState(search?.checkIn ?? addDaysToInputDate(today, 1));
  const [checkOut, setCheckOut] = useState(search?.checkOut ?? addDaysToInputDate(today, 3));
  const [guests, setGuests] = useState(search?.guests ?? 2);

  const [filters, setFilters] = useState(loadFilters);
  // Na telefonie lista udogodnień jest zwinięta, żeby pokoje były widoczne od razu pod wyszukiwarką
  const [showAmenities, setShowAmenities] = useState(false);
  const updateFilters = (changes) => {
    const next = { ...filters, ...changes };
    setFilters(next);
    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // brak dostępu do sessionStorage (np. tryb prywatny) - filtry działają bez zapamiętywania
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getRoomTypes();
        setRoomTypes(data);
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!search) return;
    const loadResults = async () => {
      try {
        const data = await searchRoomTypes(search);
        setSearchResults(data);
        setError('');
      } catch (err) {
        setSearchResults(null);
        setError(errorMessage(err));
      }
    };
    loadResults();
  }, [search]);

  // Wyniki wyszukiwania tylko przy aktywnym wyszukiwaniu ("Pokaż wszystkie pokoje" je chowa)
  const results = search ? searchResults : null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (checkIn >= checkOut) { setError('Data wyjazdu musi być późniejsza niż data przyjazdu.'); return; }
    onSearch({ checkIn, checkOut, guests });
  };

  const maxGuests = Math.max(4, ...roomTypes.map(rt => rt.maxOccupancy));
  const resultFor = (id) => results?.find(r => r.roomTypeId === id);

  // Udogodnienia do filtra - wszystkie występujące w pokojach (zapamiętane, a już nieistniejące są pomijane)
  const allAmenities = [...new Set(roomTypes.flatMap(rt => rt.amenities ?? []))].sort((a, b) => a.localeCompare(b, 'pl'));
  const activeAmenities = filters.amenities.filter(a => allAmenities.includes(a));
  const onlyAvailable = results !== null && filters.onlyAvailable;
  const hasActiveFilters = filters.sort !== 'recommended' || activeAmenities.length > 0 || onlyAvailable;

  const toggleAmenity = (amenity) => updateFilters({
    amenities: activeAmenities.includes(amenity) ? activeAmenities.filter(a => a !== amenity) : [...activeAmenities, amenity]
  });

  // Cena do sortowania: przy wyszukiwaniu cena całego pobytu, bez wyszukiwania cena za noc
  const priceOf = (rt) => resultFor(rt.roomTypeId)?.totalPrice ?? rt.basePrice;
  const compareBySort = (a, b) => {
    switch (filters.sort) {
      case 'priceAsc': return priceOf(a) - priceOf(b);
      case 'priceDesc': return priceOf(b) - priceOf(a);
      case 'rating': return (b.averageRating ?? 0) - (a.averageRating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      case 'capacity': return b.maxOccupancy - a.maxOccupancy;
      default: return results ? priceOf(a) - priceOf(b) : 0;
    }
  };

  // Przy wyszukiwaniu: ukrywamy typy za małe dla tylu gości, a dostępne pokoje są zawsze na początku listy
  const fittingRoomTypes = roomTypes.filter(rt => !results || resultFor(rt.roomTypeId)?.fitsGuests);
  const visibleRoomTypes = fittingRoomTypes
    .filter(rt => activeAmenities.every(a => (rt.amenities ?? []).includes(a)))
    .filter(rt => !onlyAvailable || resultFor(rt.roomTypeId)?.isAvailable)
    .sort((a, b) => {
      const ra = resultFor(a.roomTypeId), rb = resultFor(b.roomTypeId);
      if (ra && rb && ra.isAvailable !== rb.isAvailable) return ra.isAvailable ? -1 : 1;
      return compareBySort(a, b);
    });
  const hiddenCount = roomTypes.length - fittingRoomTypes.length;
  const availableCount = results ? visibleRoomTypes.filter(rt => resultFor(rt.roomTypeId)?.isAvailable).length : 0;
  const nights = search ? Math.round((new Date(search.checkOut).getTime() - new Date(search.checkIn).getTime()) / 86400000) : 0;

  // Wolny termin z propozycji (pokój zajęty w wyszukiwanym terminie) - nowe wyszukiwanie i przejście do pokoju
  const handleSelectAlternative = (roomTypeId, newCheckIn, newCheckOut) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    onSearch({ checkIn: newCheckIn, checkOut: newCheckOut, guests: search.guests });
    onSelect(roomTypeId);
  };

  const amenitiesLine = (rt) => (rt.amenities ?? []).slice(0, 4).join(' · ');
  const ratingLine = (rt) => rt.averageRating !== null && rt.averageRating !== undefined && (rt.reviewCount ?? 0) > 0
    ? <><StarRating rating={rt.averageRating} /> <span className="font-semibold text-navy-900">{rt.averageRating.toLocaleString('pl-PL', { minimumFractionDigits: 1 })}</span> · {reviewsLabel(rt.reviewCount)}</>
    : 'Brak opinii';

  // Przełączniki sortowania i udogodnień - w kolumnie filtrów po lewej
  const sortChips = (
    <div className="flex flex-wrap gap-2">
      {Object.entries(sortLabels).map(([value, label]) => (
        <button key={value} type="button" aria-pressed={filters.sort === value} onClick={() => updateFilters({ sort: value })}
          className={`chip ${filters.sort === value ? 'chip-active' : ''}`}>{label}</button>
      ))}
    </div>
  );
  const amenityChips = allAmenities.length > 0 && (
    <div className={`flex-wrap gap-2 ${showAmenities ? 'flex' : 'hidden md:flex'}`}>
      {allAmenities.map(a => {
        const active = activeAmenities.includes(a);
        return <button key={a} type="button" aria-pressed={active} onClick={() => toggleAmenity(a)} className={`chip ${active ? 'chip-active' : ''}`}>{active ? '✓ ' : ''}{a}</button>;
      })}
    </div>
  );
  const amenitiesToggle = allAmenities.length > 0 && (
    <button type="button" onClick={() => setShowAmenities(show => !show)} aria-expanded={showAmenities} className="chip md:hidden">
      {showAmenities ? 'Ukryj listę' : `Pokaż listę${activeAmenities.length > 0 ? ` (wybrane: ${activeAmenities.length})` : ''}`} {showAmenities ? '▴' : '▾'}
    </button>
  );
  const clearFiltersButton = hasActiveFilters && (
    <button type="button" onClick={() => updateFilters(defaultFilters)} className="link text-sm">Wyczyść filtry</button>
  );

  const searchField = 'flex flex-col gap-1 px-4 py-3 rounded-[10px] bg-sand-100';
  const searchLabel = 'text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]';
  const searchInput = 'w-full border-0 bg-transparent p-0 text-base font-medium text-navy-900 outline-none';

  return (
    <div className="w-full">
      {/* --- ZDJĘCIE HOTELU Z TYTUŁEM (menu z App.jsx leży na zdjęciu) --- */}
      <section className={`hero-photo ${search ? 'pt-40 md:pt-36 pb-24' : 'pt-44 md:pt-48 pb-28 md:pb-36'}`}>
        <div className="max-w-page mx-auto px-4 md:px-6 space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brass-300">{search ? 'Wyniki wyszukiwania' : 'Częstochowa · rezerwacja online'}</p>
          {search ? (
            <h1 className="text-3xl md:text-[2.75rem] font-medium leading-tight text-white">Wolne pokoje: {formatDate(search.checkIn)} - {formatDate(search.checkOut)}</h1>
          ) : (
            <>
              <h1 className="max-w-2xl text-4xl md:text-6xl font-medium leading-[1.05] text-white">Pokoje i apartamenty w{'\u00a0'}Częstochowie</h1>
              <p className="max-w-lg text-lg leading-relaxed text-white/90">Wybierz termin i liczbę gości - od razu zobaczysz wolne pokoje i cenę całego pobytu.</p>
            </>
          )}
        </div>
      </section>

      {/* --- WYSZUKIWARKA nachodząca na zdjęcie --- */}
      <div className={`relative max-w-page mx-auto px-4 md:px-6 ${search ? '-mt-14' : '-mt-16'}`}>
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-white p-3 rounded-2xl shadow-[0_12px_40px_rgb(20_33_61_/_0.16)]">
          <label className={searchField}>
            <span className={searchLabel}>Przyjazd</span>
            <input type="date" required min={today} value={checkIn}
              onChange={e => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDaysToInputDate(e.target.value, 1)); }}
              className={searchInput} />
          </label>
          <label className={searchField}>
            <span className={searchLabel}>Wyjazd</span>
            <input type="date" required min={addDaysToInputDate(checkIn || today, 1)} value={checkOut} onChange={e => setCheckOut(e.target.value)} className={searchInput} />
          </label>
          <label className={searchField}>
            <span className={searchLabel}>Goście</span>
            <select value={guests} onChange={e => setGuests(Number(e.target.value))} className={searchInput}>
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map(n => <option key={n} value={n}>{personsLabel(n)}</option>)}
            </select>
          </label>
          <button type="submit" className="btn-primary min-h-14 rounded-[10px]">{search ? 'Szukaj ponownie' : 'Sprawdź dostępność'}</button>
        </form>
      </div>

      <div className="max-w-page mx-auto px-4 md:px-6 pt-12 md:pt-16 pb-16 space-y-8">
        {error && <Alert type="error" message={error} />}
        {isLoading && <p className="text-slate-500">Ładowanie pokoi...</p>}

        {/* Filtry zawsze w kolumnie po lewej, pokoje po prawej (na wąskim ekranie filtry są nad listą) */}
        <div className="flex flex-wrap gap-8 items-start">
          <aside className="flex-[1_1_15rem] lg:max-w-[17.5rem] space-y-7 lg:sticky lg:top-6">
            <div className="flex justify-between items-baseline gap-3">
              <h2 className="text-2xl font-medium">Filtry</h2>
              {search && <button type="button" onClick={onClearSearch} className="link text-sm">Wyczyść wyszukiwanie</button>}
            </div>
            <div className="space-y-2.5">
              <p className="eyebrow">Sortuj</p>
              {sortChips}
            </div>
            {/* Dostępność ma sens tylko po wyszukaniu terminu */}
            {search && results && (
              <div className="space-y-2.5">
                <p className="eyebrow">Dostępność</p>
                <label className="flex items-center gap-2.5 rounded-[10px] bg-sand-100 px-3.5 py-3 text-[15px]">
                  <input type="checkbox" checked={filters.onlyAvailable} onChange={e => updateFilters({ onlyAvailable: e.target.checked })} className="w-[18px] h-[18px] accent-navy-900" />
                  Tylko wolne w tym terminie
                </label>
              </div>
            )}
            {amenityChips && (
              <div className="space-y-2.5">
                <p className="eyebrow">Udogodnienia</p>
                {amenitiesToggle}
                {amenityChips}
              </div>
            )}
            {clearFiltersButton}
          </aside>

          <section className="flex-[999_1_35rem] min-w-0 space-y-5">
            {search && results ? (
              // --- WYNIKI WYSZUKIWANIA: lista pokoi z ceną całego pobytu ---
              <>
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <p className="text-slate-500"><strong className="text-navy-900">Dostępne pokoje: {availableCount}</strong> · {personsLabel(search.guests)} · {nightsLabel(nights)}</p>
                    <p className="text-sm text-slate-500">Ceny za cały pobyt, bez usług dodatkowych</p>
                  </div>
                  {(hiddenCount > 0 || visibleRoomTypes.length < fittingRoomTypes.length) && (
                    <p className="text-sm text-slate-500">
                      {hiddenCount > 0 && `Pominięto pokoje dla mniejszej liczby osób: ${hiddenCount}. `}
                      {visibleRoomTypes.length < fittingRoomTypes.length && `Wyświetlono ${visibleRoomTypes.length} z ${fittingRoomTypes.length}.`}
                    </p>
                  )}

                  {visibleRoomTypes.map(rt => {
                    const result = resultFor(rt.roomTypeId);
                    const unavailable = !result?.isAvailable;
                    return (
                      <article key={rt.roomTypeId} className={`flex flex-wrap rounded-2xl overflow-hidden bg-white border ${unavailable ? 'border-dashed border-sand-400' : 'border-sand-300'}`}>
                        <button type="button" onClick={() => onSelect(rt.roomTypeId)} aria-label={`${rt.name} - zobacz pokój`} className="flex-[1_1_16rem] sm:max-w-80 min-h-52 bg-sand-100">
                          {rt.mainPhotoUrl
                            ? <img src={photoUrl(rt.mainPhotoUrl)} alt={rt.name} loading="lazy" className={`w-full h-full object-cover ${unavailable ? 'grayscale-[0.6] opacity-80' : ''}`} />
                            : <RoomPhotoPlaceholder />}
                        </button>

                        <div className="flex-[999_1_16rem] min-w-0 p-5 md:p-6 flex flex-col gap-2">
                          <div className="flex flex-wrap justify-between items-baseline gap-2">
                            <h3 className="text-2xl md:text-[1.625rem] font-medium">{rt.name}</h3>
                            {unavailable && <span className="px-3 py-1.5 rounded-full bg-danger-50 text-danger-700 text-[13px] font-semibold">Brak wolnych pokoi w tym terminie</span>}
                          </div>
                          <p className="text-sm text-slate-500">do {personsLabel(rt.maxOccupancy)}{rt.area > 0 && ` · ${rt.area} m²`} · {ratingLine(rt)}</p>
                          {unavailable ? (
                            <div className="pt-2">
                              <AlternativeStays roomTypeId={rt.roomTypeId} checkIn={search.checkIn} checkOut={search.checkOut} onSelectStay={(newCheckIn, newCheckOut) => handleSelectAlternative(rt.roomTypeId, newCheckIn, newCheckOut)} />
                            </div>
                          ) : (
                            <>
                              {rt.description && <p className="text-[15px] leading-relaxed text-slate-600 line-clamp-2">{rt.description}</p>}
                              {amenitiesLine(rt) && <p className="text-sm text-slate-500">{amenitiesLine(rt)}</p>}
                              <button type="button" onClick={() => onSelect(rt.roomTypeId)} className="mt-auto pt-2 self-start text-sm font-semibold hover:text-brass-700 hover:underline">Zdjęcia, opis i kalendarz →</button>
                            </>
                          )}
                        </div>

                        {!unavailable && (
                          <div className="flex-[1_1_13rem] p-5 md:p-6 bg-sand-50 flex flex-col justify-between items-end gap-3.5 text-right">
                            <span className="px-3 py-1.5 rounded-full bg-success-50 text-success-700 text-[13px] font-semibold">{result.availableRooms === 1 ? 'Ostatni wolny pokój' : `Wolne pokoje: ${result.availableRooms}`}</span>
                            <div>
                              <p className="font-display text-3xl font-semibold">{result.totalPrice} zł</p>
                              <p className="text-[13px] text-slate-500">za {nightsLabel(result.nights)}</p>
                            </div>
                            <button type="button" onClick={() => onSelect(rt.roomTypeId)} className="btn-primary py-3">Wybierz pokój</button>
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {!isLoading && visibleRoomTypes.length === 0 && (
                    fittingRoomTypes.length > 0
                      ? <p className="text-slate-500">Żaden pokój nie spełnia wybranych filtrów. {clearFiltersButton}</p>
                      : <p className="text-slate-500">Brak pokoi dla tylu osób. Zmień liczbę gości w wyszukiwarce.</p>
                  )}
              </>
            ) : (
              // --- WSZYSTKIE POKOJE (bez wyszukiwania): kafelki ze zdjęciem ---
              <>
                <div>
                  <h2 className="text-3xl md:text-[2.5rem] font-medium">Nasze pokoje</h2>
                  <p className="mt-2 text-slate-500">Kliknij pokój, aby zobaczyć zdjęcia, opis, kalendarz i opinie. Wybierz daty powyżej, a zobaczysz wolne pokoje i cenę całego pobytu.</p>
                  {hasActiveFilters && visibleRoomTypes.length < fittingRoomTypes.length && <p className="mt-2 text-sm text-slate-500">Wyświetlono {visibleRoomTypes.length} z {fittingRoomTypes.length}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10 pt-2">
                  {visibleRoomTypes.map(rt => (
                    <button key={rt.roomTypeId} type="button" onClick={() => onSelect(rt.roomTypeId)} className="group flex flex-col gap-4 text-left">
                      <div className="relative w-full aspect-[4/3] rounded-[14px] overflow-hidden bg-sand-100">
                        {rt.mainPhotoUrl
                          ? <img src={photoUrl(rt.mainPhotoUrl)} alt={rt.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          : <RoomPhotoPlaceholder />}
                        <span className="absolute left-3 top-3 px-3 py-1.5 rounded-full bg-white/95 text-[13px] font-semibold">do {personsLabel(rt.maxOccupancy)}{rt.area > 0 && ` · ${rt.area} m²`}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline gap-3">
                          <h3 className="text-2xl font-medium group-hover:text-brass-700 transition-colors">{rt.name}</h3>
                          <span className="whitespace-nowrap text-[15px] text-slate-500">od <strong className="text-xl text-navy-900">{rt.basePrice} zł</strong> / noc</span>
                        </div>
                        {amenitiesLine(rt) && <p className="text-[15px] text-slate-500">{amenitiesLine(rt)}</p>}
                        <p className="text-sm text-slate-500">{ratingLine(rt)}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {!isLoading && !error && visibleRoomTypes.length === 0 && (
                  roomTypes.length > 0
                    ? <p className="text-slate-500">Żaden pokój nie spełnia wybranych filtrów. {clearFiltersButton}</p>
                    : <p className="text-slate-500">Brak pokoi w ofercie.</p>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* --- INFORMACJE O POBYCIE --- */}
      <section className="bg-sand-100 border-b border-sand-300">
        <div className="max-w-page mx-auto px-4 md:px-6 py-10 md:py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[['Zameldowanie', 'od 14:00'], ['Wymeldowanie', 'do 11:00'], ['Recepcja', 'czynna całą dobę'], ['Bezpłatne anulowanie', 'do 7 dni przed']].map(([label, value]) => (
            <div key={label}>
              <p className="eyebrow">{label}</p>
              <p className="mt-1.5 font-display text-xl md:text-[1.625rem]">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
