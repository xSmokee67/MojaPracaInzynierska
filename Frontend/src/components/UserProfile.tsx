// Plik: Frontend/src/components/UserProfile.tsx
import { useState, useEffect } from 'react';
import type { ProfileDto, UpdateProfileDto } from '../types/profile';
import type { ReviewDto } from '../types/reservation';
import { getProfile, updateProfile, changePassword } from '../api/profileApi';
import { getMyReviews } from '../api/reservationApi';
import { errorMessage } from '../api/apiErrors';
import { formatDate } from '../utils/format';

// Strona "Mój profil": dane konta, ich edycja, zmiana hasła i (dla gościa) wystawione opinie
export default function UserProfile({ token, onProfileUpdated, onNavigate }: { token: string; onProfileUpdated: (firstName: string) => void; onNavigate: (path: string) => void }) {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Formularz edycji danych (null = tryb podglądu)
  const [editForm, setEditForm] = useState<UpdateProfileDto | null>(null);

  // Formularz zmiany hasła
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getProfile(token);
        setProfile(data);
        if (data.role === 'Guest') setReviews(await getMyReviews(token));
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reloadKey]);

  const isGuest = profile?.role === 'Guest';

  const handleStartEdit = () => {
    if (!profile) return;
    setEditForm({ firstName: profile.firstName, lastName: profile.lastName, phoneNumber: profile.phoneNumber, documentNumber: profile.documentNumber });
    setMessage('');
    setError('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    try {
      await updateProfile(editForm, token);
      setMessage('Dane profilu zostały zapisane.');
      setError('');
      setEditForm(null);
      onProfileUpdated(editForm.firstName.trim());
      setReloadKey(key => key + 1);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (newPassword !== repeatPassword) { setPasswordError('Nowe hasła nie są takie same.'); return; }
    try {
      await changePassword({ currentPassword, newPassword }, token);
      setPasswordMessage('Hasło zostało zmienione.');
      setCurrentPassword(''); setNewPassword(''); setRepeatPassword('');
    } catch (err) {
      setPasswordError(errorMessage(err));
    }
  };

  return (
    <div className="w-full max-w-5xl p-4 md:p-6 bg-white rounded-xl shadow-lg space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Mój profil</h2>
        {profile && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isGuest ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {isGuest ? 'Konto gościa' : 'Konto właściciela'}
          </span>
        )}
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
      {message && !error && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">{message}</div>}

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* --- DANE KONTA --- */}
          <div className="p-5 rounded-lg border space-y-4">
            <div className="flex justify-between items-center gap-2">
              <h3 className="font-bold text-slate-700 text-lg">Dane konta</h3>
              {!editForm && <button type="button" onClick={handleStartEdit} className="text-sm px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Edytuj dane</button>}
            </div>

            {!editForm ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                <dt className="text-slate-500">Imię i nazwisko</dt><dd className="font-semibold text-slate-800">{profile.firstName} {profile.lastName}</dd>
                <dt className="text-slate-500">E-mail</dt><dd className="font-semibold text-slate-800 break-all">{profile.email}</dd>
                {isGuest && (<>
                  <dt className="text-slate-500">Telefon</dt><dd className="font-semibold text-slate-800">{profile.phoneNumber || '—'}</dd>
                  <dt className="text-slate-500">Nr dokumentu</dt><dd className="font-semibold text-slate-800">{profile.documentNumber || <span className="font-normal text-slate-500">nie podano</span>}</dd>
                </>)}
                <dt className="text-slate-500">Konto od</dt><dd className="font-semibold text-slate-800">{formatDate(profile.registrationDate)}</dd>
              </dl>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Imię</label>
                    <input type="text" required maxLength={50} value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Nazwisko</label>
                    <input type="text" required maxLength={50} value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
                  </div>
                </div>
                {isGuest && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Telefon</label>
                      <input type="tel" required pattern="\+?[0-9 ]{9,15}" title="Podaj 9-15 cyfr, np. +48 600 100 200." value={editForm.phoneNumber} onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Nr dokumentu (opcjonalnie)</label>
                      <input type="text" maxLength={20} pattern="[A-Za-z0-9 ]*" title="Tylko litery i cyfry." placeholder="np. ABC123456" value={editForm.documentNumber} onChange={e => setEditForm({ ...editForm, documentNumber: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-500">Adres e-mail ({profile.email}) jest loginem do konta i nie można go zmienić.</p>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Zapisz Zmiany</button>
                  <button type="button" onClick={() => setEditForm(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Anuluj</button>
                </div>
              </form>
            )}
          </div>

          {/* --- ZMIANA HASŁA --- */}
          <form onSubmit={handleChangePassword} className="p-5 rounded-lg border space-y-4">
            <h3 className="font-bold text-slate-700 text-lg">Zmiana hasła</h3>
            {passwordError && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{passwordError}</div>}
            {passwordMessage && !passwordError && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">{passwordMessage}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Obecne hasło</label>
              <input type="password" required autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Nowe hasło</label>
              <input type="password" required autoComplete="new-password" pattern="(?=.*[0-9]).{8,}" title="Hasło musi mieć co najmniej 8 znaków, w tym jedną cyfrę." value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
              <p className="mt-1 text-xs text-slate-500">Minimum 8 znaków, w tym co najmniej jedna cyfra.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Powtórz nowe hasło</label>
              <input type="password" required autoComplete="new-password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Zmień hasło</button>
          </form>
        </div>
      )}

      {/* --- SKRÓTY I OPINIE --- */}
      {profile && !isGuest && (
        <div className="p-5 rounded-lg border bg-red-50 border-red-200 flex flex-wrap justify-between items-center gap-4">
          <p className="text-sm text-red-900">Zarządzanie pokojami, cennikiem, rezerwacjami i opiniami znajdziesz w Panelu Właściciela.</p>
          <button type="button" onClick={() => onNavigate('/panel')} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Panel Właściciela</button>
        </div>
      )}

      {profile && isGuest && (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="font-bold text-slate-700 text-lg">Moje opinie</h3>
            <button type="button" onClick={() => onNavigate('/moje-rezerwacje')} className="text-sm font-semibold text-emerald-600 hover:underline">Moje rezerwacje →</button>
          </div>
          {reviews.map(r => (
            <div key={r.reviewId} className="p-4 rounded-lg bg-slate-50 border space-y-1">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-800">{r.roomTypeName} <span className="font-normal text-slate-500">· rezerwacja #{r.reservationId}</span></span>
                <span className="text-amber-500 whitespace-nowrap">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
              <div className="text-xs text-slate-500">{formatDate(r.date!)}</div>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-slate-500">Nie wystawiłeś jeszcze żadnej opinii. Opinię możesz dodać w szczegółach zakończonej rezerwacji.</p>}
        </div>
      )}
    </div>
  );
}