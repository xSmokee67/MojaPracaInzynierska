// Plik: Frontend/src/components/RoomGallery.tsx
import { useState, useEffect } from 'react';
import type { RoomTypeDto } from '../types/admin';
import { getRoomTypes } from '../api/adminApi';
import { photoUrl } from '../api/roomApi';
import { personsLabel } from '../utils/format';
import RoomPhotoPlaceholder from './RoomPhotoPlaceholder';

// Strona główna: kafelki typów pokoi - kliknięcie otwiera profil pokoju
export default function RoomGallery({ onSelect }: { onSelect: (roomTypeId: number) => void }) {
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const data = await getRoomTypes();
      setRoomTypes(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="w-full max-w-6xl space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-slate-800">Wybierz pokój dla siebie</h2>
        <p className="text-slate-600 leading-relaxed">Kliknij pokój, aby zobaczyć zdjęcia, opis, udogodnienia i opinie gości.</p>
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
      {isLoading && <p className="text-slate-500">Ładowanie pokoi...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {roomTypes.map(rt => (
          <button key={rt.roomTypeId} type="button" onClick={() => onSelect(rt.roomTypeId!)}
            className="group flex flex-col text-left bg-white rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <div className="w-full aspect-[4/3] overflow-hidden bg-slate-200">
              {rt.mainPhotoUrl
                ? <img src={photoUrl(rt.mainPhotoUrl)} alt={rt.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                : <RoomPhotoPlaceholder />}
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-xl font-bold text-slate-800">{rt.name}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span><span className="font-bold text-emerald-600">{rt.basePrice} PLN</span> / noc</span>
                <span>do {personsLabel(rt.maxOccupancy)}</span>
              </div>
              {rt.description && <p className="text-sm text-slate-600 line-clamp-2">{rt.description}</p>}
              <span className="inline-block pt-1 text-sm font-semibold text-emerald-600 group-hover:underline">Zobacz pokój →</span>
            </div>
          </button>
        ))}
      </div>

      {!isLoading && !error && roomTypes.length === 0 && <p className="text-slate-500">Brak pokoi w ofercie.</p>}
    </div>
  );
}