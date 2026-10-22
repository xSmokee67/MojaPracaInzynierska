// Plik: Frontend/src/components/account/UserProfile.jsx
import { useState, useEffect } from 'react';
import { getProfile } from '../../api/profileApi';
import { getMyReviews } from '../../api/reservationApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate } from '../../utils/format';
import Alert from '../common/Alert';
import StarRating from '../common/StarRating';

// Strona "Mój profil": dane konta i (dla gościa) wystawione opinie
export default function UserProfile({ token, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');

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
  }, [token]);

  const isGuest = profile?.role === 'Guest';

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

      {error && <Alert type="error" message={error} />}

      {profile && (
        <div className="p-5 rounded-lg border space-y-4">
          <h3 className="font-bold text-slate-700 text-lg">Dane konta</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-slate-500">Imię i nazwisko</dt><dd className="font-semibold text-slate-800">{profile.firstName} {profile.lastName}</dd>
            <dt className="text-slate-500">E-mail</dt><dd className="font-semibold text-slate-800 break-all">{profile.email}</dd>
            {isGuest && (<>
              <dt className="text-slate-500">Telefon</dt><dd className="font-semibold text-slate-800">{profile.phoneNumber || '—'}</dd>
            </>)}
            {isGuest && profile.documentNumber && (<>
              <dt className="text-slate-500">Nr dokumentu</dt><dd className="font-semibold text-slate-800">{profile.documentNumber}</dd>
            </>)}
            <dt className="text-slate-500">Konto od</dt><dd className="font-semibold text-slate-800">{formatDate(profile.registrationDate)}</dd>
          </dl>
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
                <StarRating rating={r.rating} />
              </div>
              {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
              <div className="text-xs text-slate-500">{formatDate(r.date)}</div>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-slate-500">Nie wystawiłeś jeszcze żadnej opinii. Opinię możesz dodać w szczegółach zakończonej rezerwacji.</p>}
        </div>
      )}
    </div>
  );
}