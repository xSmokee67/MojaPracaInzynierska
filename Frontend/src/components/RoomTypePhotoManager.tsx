// Plik: Frontend/src/components/RoomTypePhotoManager.tsx
import { useState, useEffect } from 'react';
import type { RoomTypePhotoDto } from '../types/room';
import { getRoomTypeDetails, photoUrl } from '../api/roomApi';
import { uploadRoomTypePhotos, deleteRoomTypePhoto, setMainRoomTypePhoto } from '../api/adminApi';
import { errorMessage } from '../api/apiErrors';
import Alert from './Alert';

// Limity zgodne z API (FileStorageService i RoomTypeController)
const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function RoomTypePhotoManager({ token, roomTypeId, roomTypeName, onClose, onChanged }: { token: string; roomTypeId: number; roomTypeName: string; onClose: () => void; onChanged: () => void }) {
  const [photos, setPhotos] = useState<RoomTypePhotoDto[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getRoomTypeDetails(roomTypeId);
        setPhotos(data.photos);
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [roomTypeId, reloadKey]);

  // Wspólna obsługa akcji: komunikat, odświeżenie zdjęć i listy typów pokoi
  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      setReloadKey(key => key + 1);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    // Walidacja po stronie przeglądarki - API sprawdza to samo ponownie
    const invalid = files.find(f => !ALLOWED_TYPES.includes(f.type));
    if (invalid) { setError(`Plik "${invalid.name}" ma nieobsługiwany format. Dozwolone: JPG, PNG, WEBP.`); return; }
    const tooBig = files.find(f => f.size > MAX_FILE_SIZE);
    if (tooBig) { setError(`Plik "${tooBig.name}" jest za duży. Maksymalny rozmiar to 5 MB.`); return; }
    if (photos.length + files.length > MAX_PHOTOS) { setError(`Typ pokoju może mieć maksymalnie ${MAX_PHOTOS} zdjęć (obecnie: ${photos.length}).`); return; }

    setIsUploading(true);
    await runAction(() => uploadRoomTypePhotos(roomTypeId, files, token), files.length === 1 ? 'Zdjęcie zostało dodane.' : `Dodano zdjęcia: ${files.length}.`);
    setIsUploading(false);
  };

  const handleDelete = async (photoId: number) => {
    if (!window.confirm('Na pewno usunąć to zdjęcie?')) return;
    await runAction(() => deleteRoomTypePhoto(photoId, token), 'Zdjęcie zostało usunięte.');
  };

  const handleSetMain = async (photoId: number) => {
    await runAction(() => setMainRoomTypePhoto(photoId, token), 'Ustawiono zdjęcie główne.');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-xl shadow-lg space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800">Zdjęcia: {roomTypeName}</h2>
          <button onClick={onClose} className="text-sm px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Zamknij</button>
        </div>

        {error && <Alert type="error" message={error} />}
        {message && !error && <Alert type="success" message={message} />}

        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border">
          <span className="text-sm text-slate-600">JPG, PNG lub WEBP do 5 MB, maksymalnie {MAX_PHOTOS} zdjęć ({photos.length}/{MAX_PHOTOS}). Pierwsze zdjęcie jest wyświetlane na stronie głównej.</span>
          <label className={`px-4 py-2 rounded-lg font-semibold text-white cursor-pointer ${isUploading || photos.length >= MAX_PHOTOS ? 'bg-slate-400 pointer-events-none' : 'bg-slate-800 hover:bg-slate-700'}`}>
            {isUploading ? 'Wysyłanie...' : 'Dodaj zdjęcia'}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" disabled={isUploading || photos.length >= MAX_PHOTOS} />
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, i) => (
            <div key={photo.roomTypePhotoId} className="rounded-lg border overflow-hidden">
              <div className="relative aspect-[4/3] bg-slate-200">
                <img src={photoUrl(photo.photoUrl)} alt={`Zdjęcie ${i + 1}`} className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">Główne</span>}
              </div>
              <div className="flex justify-between gap-2 p-2">
                {i === 0
                  ? <span className="text-xs text-slate-500 self-center">Na stronie głównej</span>
                  : <button onClick={() => handleSetMain(photo.roomTypePhotoId)} className="text-slate-600 hover:text-slate-900 font-medium text-sm">Ustaw jako główne</button>}
                <button onClick={() => handleDelete(photo.roomTypePhotoId)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button>
              </div>
            </div>
          ))}
        </div>
        {photos.length === 0 && <p className="text-center text-slate-500">Ten typ pokoju nie ma jeszcze zdjęć.</p>}
      </div>
    </div>
  );
}