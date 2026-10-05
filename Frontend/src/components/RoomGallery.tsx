// Plik: Frontend/src/components/RoomGallery.tsx
import { useState, useEffect } from 'react';
import type { RoomTypeDto } from '../types/admin';
import type { RoomTypeAvailabilityDto, SearchCriteria } from '../types/room';
import { getRoomTypes } from '../api/adminApi';
import { photoUrl, searchRoomTypes } from '../api/roomApi';
import { errorMessage } from '../api/apiErrors';
import { personsLabel, reviewsLabel, nightsLabel, formatDate, toInputDate, addDaysToInputDate } from '../utils/format';
import RoomPhotoPlaceholder from './RoomPhotoPlaceholder';

// Sortowanie kafelków na stronie głównej
type SortOption = 'recommended' | 'priceAsc' | 'priceDesc' | 'rating' | 'capacity';
const sortLabels: Record<SortOption, string> = {
  recommended: 'Polecane',
  priceAsc: 'Cena: od najniższej',
  priceDesc: 'Cena: od najwyższej',
  rating: 'Ocena gości',
  capacity: 'Liczba osób: od największej'
};

// Sortowanie i filtry pamiętane w sesji przeglądarki - zostają po powrocie z profilu pokoju
interface GalleryFilters { sort: SortOption; amenities: string[]; onlyAvailable: boolean }
const FILTERS_STORAGE_KEY = 'hotel_filters';
const defaultFilters: GalleryFilters = { sort: 'recommended', amenities: [], onlyAvailable: false };
const loadFilters = (): GalleryFilters => {
  try {
    const saved = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
  } catch {
    return defaultFilters;
  }
};

// Strona główna: wyszukiwarka z datami + kafelki typów pokoi (kliknięcie otwiera profil pokoju)
export default function RoomGallery({ search, onSearch, onClearSearch, onSelect }: { search: SearchCriteria | null; onSearch: (criteria: SearchCriteria) => void; onClearSearch: () => void; onSelect: (roomTypeId: number) => void }) {
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [searchResults, setSearchResults] = useState<RoomTypeAvailabilityDto[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Stan formularza wyszukiwarki (domyślnie: jutro, 2 noce, 2 osoby)
  const today = toInputDate(new Date());
  const [checkIn, setCheckIn] = useState(search?.checkIn ?? addDaysToInputDate(today, 1));
  const [checkOut, setCheckOut] = useState(search?.checkOut ?? addDaysToInputDate(today, 3));
  const [guests, setGuests] = useState(search?.guests ?? 2);

  const [filters, setFilters] = useState<GalleryFilters>(loadFilters);
  const updateFilters = (changes: Partial<GalleryFilters>) => {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkIn >= checkOut) { setError('Data wyjazdu musi być późniejsza niż data przyjazdu.'); return; }
    onSearch({ checkIn, checkOut, guests });
  };

  const maxGuests = Math.max(4, ...roomTypes.map(rt => rt.maxOccupancy));
  const heroPhoto = roomTypes.find(rt => rt.mainPhotoUrl)?.mainPhotoUrl;
  const resultFor = (id: number) => results?.find(r => r.roomTypeId === id);

  // Udogodnienia do filtra - wszystkie występujące w pokojach (zapamiętane, a już nieistniejące są pomijane)
  const allAmenities = [...new Set(roomTypes.flatMap(rt => rt.amenities ?? []))].sort((a, b) => a.localeCompare(b, 'pl'));
  const activeAmenities = filters.amenities.filter(a => allAmenities.includes(a));
  const onlyAvailable = results !== null && filters.onlyAvailable;
  const hasActiveFilters = filters.sort !== 'recommended' || activeAmenities.length > 0 || onlyAvailable;

  const toggleAmenity = (amenity: string) => updateFilters({
    amenities: activeAmenities.includes(amenity) ? activeAmenities.filter(a => a !== amenity) : [...activeAmenities, amenity]
  });

  // Cena do sortowania: przy wyszukiwaniu cena całego pobytu, bez wyszukiwania cena za noc
  const priceOf = (rt: RoomTypeDto) => resultFor(rt.roomTypeId!)?.totalPrice ?? rt.basePrice;
  const compareBySort = (a: RoomTypeDto, b: RoomTypeDto) => {
    switch (filters.sort) {
      case 'priceAsc': return priceOf(a) - priceOf(b);
      case 'priceDesc': return priceOf(b) - priceOf(a);
      case 'rating': return (b.averageRating ?? 0) - (a.averageRating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      case 'capacity': return b.maxOccupancy - a.maxOccupancy;
      default: return results ? priceOf(a) - priceOf(b) : 0;
    }
  };

  // Przy wyszukiwaniu: ukrywamy typy za małe dla tylu gości, a dostępne pokoje są zawsze na początku listy
  const fittingRoomTypes = roomTypes.filter(rt => !results || resultFor(rt.roomTypeId!)?.fitsGuests);
  const visibleRoomTypes = fittingRoomTypes
    .filter(rt => activeAmenities.every(a => (rt.amenities ?? []).includes(a)))
    .filter(rt => !onlyAvailable || resultFor(rt.roomTypeId!)?.isAvailable)
    .sort((a, b) => {
      const ra = resultFor(a.roomTypeId!), rb = resultFor(b.roomTypeId!);
      if (ra && rb && ra.isAvailable !== rb.isAvailable) return ra.isAvailable ? -1 : 1;
      return compareBySort(a, b);
    });
  const hiddenCount = roomTypes.length - fittingRoomTypes.length;
  const availableCount = results ? visibleRoomTypes.filter(rt => resultFor(rt.roomTypeId!)?.isAvailable).length : 0;
  const nights = search ? Math.round((new Date(search.checkOut).getTime() - new Date(search.checkIn).getTime()) / 86400000) : 0;

  return (
    <div className="w-full max-w-6xl space-y-8">
      {/* --- SEKCJA POWITALNA Z WYSZUKIWARKĄ --- */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-800 to-slate-900">
        {heroPhoto && <img src={photoUrl(heroPhoto)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-slate-900/20" />
        <div className="relative px-6 pt-16 pb-6 md:px-10 md:pt-24 md:pb-10 space-y-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white">Hotel Resort</h2>
            <p className="text-lg text-slate-100">Komfortowe pokoje i apartamenty. Sprawdź dostępność w wybranym terminie i zarezerwuj pobyt online.</p>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-xl shadow-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Przyjazd</label>
              <input type="date" required min={today} value={checkIn}
                onChange={e => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDaysToInputDate(e.target.value, 1)); }}
                className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Wyjazd</label>
              <input type="date" required min={addDaysToInputDate(checkIn || today, 1)} value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Goście</label>
              <select value={guests} onChange={e => setGuests(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map(n => <option key={n} value={n}>{personsLabel(n)}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors">Szukaj pokoi</button>
            </div>
          </form>
        </div>
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}

      {/* --- NAGŁÓWEK LISTY --- */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        {search && results ? (
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-800">Dostępne pokoje: {availableCount}</h3>
            <p className="text-slate-600">{formatDate(search.checkIn)} - {formatDate(search.checkOut)} · {nightsLabel(nights)} · {personsLabel(search.guests)}</p>
            {hiddenCount > 0 && <p className="text-sm text-slate-500">Pominięto pokoje dla mniejszej liczby osób: {hiddenCount}</p>}
          </div>
        ) : (
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-800">Nasze pokoje</h3>
            <p className="text-slate-600">Kliknij pokój, aby zobaczyć zdjęcia, opis, udogodnienia i opinie gości.</p>
          </div>
        )}
        {search && <button type="button" onClick={onClearSearch} className="text-sm px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Pokaż wszystkie pokoje</button>}
      </div>

      {/* --- SORTOWANIE I FILTRY --- */}
      {fittingRoomTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-white p-4 rounded-xl shadow-sm">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            Sortuj:
            <select value={filters.sort} onChange={e => updateFilters({ sort: e.target.value as SortOption })} className="px-3 py-1.5 border rounded-lg outline-none bg-white text-slate-800">
              {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          {allAmenities.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Udogodnienia:</span>
              {allAmenities.map(a => {
                const active = activeAmenities.includes(a);
                return (
                  <button key={a} type="button" aria-pressed={active} onClick={() => toggleAmenity(a)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-500'}`}>
                    {active ? '✓ ' : ''}{a}
                  </button>
                );
              })}
            </div>
          )}

          {results && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input type="checkbox" checked={filters.onlyAvailable} onChange={e => updateFilters({ onlyAvailable: e.target.checked })} className="accent-emerald-600" />
              Tylko dostępne
            </label>
          )}

          {hasActiveFilters && (
            <div className="flex items-center gap-3 md:ml-auto text-sm">
              {visibleRoomTypes.length < fittingRoomTypes.length && <span className="text-slate-500">Wyświetlono {visibleRoomTypes.length} z {fittingRoomTypes.length}</span>}
              <button type="button" onClick={() => updateFilters(defaultFilters)} className="font-semibold text-emerald-600 hover:underline">Wyczyść filtry</button>
            </div>
          )}
        </div>
      )}

      {isLoading && <p className="text-slate-500">Ładowanie pokoi...</p>}

      {/* --- KAFELKI --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleRoomTypes.map(rt => {
          const result = resultFor(rt.roomTypeId!);
          const unavailable = result !== undefined && !result.isAvailable;
          const amenities = rt.amenities ?? [];

          return (
            <button key={rt.roomTypeId} type="button" onClick={() => onSelect(rt.roomTypeId!)}
              className="group flex flex-col text-left bg-white rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-200">
                {rt.mainPhotoUrl
                  ? <img src={photoUrl(rt.mainPhotoUrl)} alt={rt.name} loading="lazy" className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${unavailable ? 'grayscale opacity-70' : ''}`} />
                  : <RoomPhotoPlaceholder />}
                {result && (
                  <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold shadow ${unavailable ? 'bg-slate-700 text-white' : result.availableRooms === 1 ? 'bg-amber-400 text-amber-950' : 'bg-emerald-600 text-white'}`}>
                    {unavailable ? 'Brak wolnych pokoi' : result.availableRooms === 1 ? 'Ostatni wolny pokój!' : 'Dostępny'}
                  </span>
                )}
              </div>
              <div className="flex flex-col flex-1 p-5 gap-2">
                <h3 className="text-xl font-bold text-slate-800">{rt.name}</h3>

                <div className="text-sm text-slate-600">
                  {rt.averageRating !== null && rt.averageRating !== undefined && (rt.reviewCount ?? 0) > 0
                    ? <><span className="text-amber-500">★</span> <span className="font-semibold text-slate-800">{rt.averageRating.toLocaleString('pl-PL', { minimumFractionDigits: 1 })}</span> · {reviewsLabel(rt.reviewCount!)}</>
                    : <span className="text-slate-500">Brak opinii</span>}
                  <span className="mx-2 text-slate-300">|</span>do {personsLabel(rt.maxOccupancy)}
                </div>

                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {amenities.slice(0, 3).map(a => <span key={a} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium">{a}</span>)}
                    {amenities.length > 3 && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">+{amenities.length - 3}</span>}
                  </div>
                )}

                {rt.description && <p className="text-sm text-slate-600 line-clamp-2">{rt.description}</p>}

                <div className="mt-auto pt-2 flex justify-between items-end gap-2">
                  {result
                    ? <div><span className={`text-xl font-bold ${unavailable ? 'text-slate-400' : 'text-emerald-600'}`}>{result.totalPrice} PLN</span> <span className="text-sm text-slate-500">za {nightsLabel(result.nights)}</span></div>
                    : <div><span className="text-xl font-bold text-emerald-600">{rt.basePrice} PLN</span> <span className="text-sm text-slate-500">/ noc</span></div>}
                  <span className="text-sm font-semibold text-emerald-600 group-hover:underline whitespace-nowrap">Zobacz pokój →</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!isLoading && !error && visibleRoomTypes.length === 0 && (
        fittingRoomTypes.length > 0
          ? <p className="text-slate-500">Żaden pokój nie spełnia wybranych filtrów. <button type="button" onClick={() => updateFilters(defaultFilters)} className="font-semibold text-emerald-600 hover:underline">Wyczyść filtry</button></p>
          : <p className="text-slate-500">{search ? 'Brak pokoi dla tylu osób. Zmień liczbę gości w wyszukiwarce.' : 'Brak pokoi w ofercie.'}</p>
      )}
    </div>
  );
}