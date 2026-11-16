// Plik: Frontend/src/components/admin/RoomTypePhotoManager.jsx
import { useState, useEffect } from 'react';
import { getRoomTypeDetails, photoUrl } from '../../api/roomApi';
import { uploadRoomTypePhotos, deleteRoomTypePhoto, setMainRoomTypePhoto } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import Alert from '../common/Alert';
import { resizeImage } from '../../utils/resizeImage';

// Limity zgodne z API (FileStorageService i RoomTypeController)
const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function RoomTypePhotoManager({ token, roomTypeId, roomTypeName, onClose, onChanged }) {
  const [photos, setPhotos] = useState([]);
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
  const runAction = async (action, successMessage) => {
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

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    // Walidacja po stronie przeglądarki - API sprawdza to samo ponownie
    const invalid = files.find(f => !ALLOWED_TYPES.includes(f.type));
    if (invalid) { setError(`Plik "${invalid.name}" ma nieobsługiwany format. Dozwolone: JPG, PNG, WEBP.`); return; }
    if (photos.length + files.length > MAX_PHOTOS) { setError(`Typ pokoju może mieć maksymalnie ${MAX_PHOTOS} zdjęć (obecnie: ${photos.length}).`); return; }

    setIsUploading(true);
    // Zdjęcia z aparatu (kilka MB, 4000+ px) są zmniejszane do 1600 px i zapisywane bez EXIF jeszcze w przeglądarce,
    // więc limit 5 MB sprawdzamy dopiero po zmniejszeniu
    const resized = await Promise.all(files.map(resizeImage));
    const tooBig = resized.find(f => f.size > MAX_FILE_SIZE);
    if (tooBig) { setError(`Plik "${tooBig.name}" jest za duży. Maksymalny rozmiar to 5 MB.`); setIsUploading(false); return; }

    await runAction(() => uploadRoomTypePhotos(roomTypeId, resized, token), resized.length === 1 ? 'Zdjęcie zostało dodane.' : `Dodano zdjęcia: ${resized.length}.`);
    setIsUploading(false);
  };

  const handleDelete = async (photoId) => {
    if (!window.confirm('Na pewno usunąć to zdjęcie?')) return;
    await runAction(() => deleteRoomTypePhoto(photoId, token), 'Zdjęcie zostało usunięte.');
  };

  const handleSetMain = async (photoId) => {
    await runAction(() => setMainRoomTypePhoto(photoId, token), 'Ustawiono zdjęcie główne.');
  };

  return (
    <div className="fixed inset-0 bg-navy-950/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-7 bg-white rounded-2xl shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center gap-4 border-b border-sand-200 pb-4">
          <h2 className="text-2xl font-medium">Zdjęcia: {roomTypeName}</h2>
          <button onClick={onClose} className="text-sm px-4 py-2 border border-slate-300 bg-white text-navy-900 rounded-full font-semibold hover:border-navy-900">Zamknij</button>
        </div>

        {error && <Alert type="error" message={error} />}
        {message && !error && <Alert type="success" message={message} />}

        <div className="flex flex-wrap items-center justify-between gap-4 bg-sand-100 p-4 md:p-5 rounded-2xl">
          <span className="text-sm text-slate-600">JPG, PNG lub WEBP do 5 MB, maksymalnie {MAX_PHOTOS} zdjęć ({photos.length}/{MAX_PHOTOS}). Pierwsze zdjęcie jest wyświetlane na stronie głównej.</span>
          <label className={`px-4 py-2.5 rounded-[10px] font-semibold text-white cursor-pointer transition-colors ${isUploading || photos.length >= MAX_PHOTOS ? 'bg-slate-400 pointer-events-none' : 'bg-navy-900 hover:bg-navy-800'}`}>
            {isUploading ? 'Wysyłanie...' : 'Dodaj zdjęcia'}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" disabled={isUploading || photos.length >= MAX_PHOTOS} />
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, i) => (
            <div key={photo.roomTypePhotoId} className="rounded-xl border border-sand-300 overflow-hidden">
              <div className="relative aspect-[4/3] bg-sand-100">
                <img src={photoUrl(photo.photoUrl)} alt={`Zdjęcie ${i + 1}`} className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-navy-900 text-white text-xs font-bold">Główne</span>}
              </div>
              <div className="flex justify-between gap-2 p-2">
                {i === 0
                  ? <span className="text-xs text-slate-500 self-center">Na stronie głównej</span>
                  : <button onClick={() => handleSetMain(photo.roomTypePhotoId)} className="text-navy-900 hover:text-brass-700 hover:underline font-semibold text-sm">Ustaw jako główne</button>}
                <button onClick={() => handleDelete(photo.roomTypePhotoId)} className="text-danger-800 hover:underline font-semibold text-sm">Usuń</button>
              </div>
            </div>
          ))}
        </div>
        {photos.length === 0 && <p className="text-center text-slate-500">Ten typ pokoju nie ma jeszcze zdjęć.</p>}
      </div>
    </div>
  );
}