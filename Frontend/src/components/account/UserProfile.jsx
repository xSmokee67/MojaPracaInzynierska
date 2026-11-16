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

  const term = 'eyebrow';

  return (
    <div className="w-full max-w-4xl space-y-8">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <h1 className="text-4xl md:text-[2.75rem] font-medium">Mój profil</h1>
        {profile && (
          <span className={`px-3 py-1.5 rounded-full text-[13px] font-bold ${isGuest ? 'bg-success-50 text-success-700' : 'bg-info-50 text-navy-900'}`}>
            {isGuest ? 'Konto gościa' : 'Konto właściciela'}
          </span>
        )}
      </div>

      {error && <Alert type="error" message={error} />}

      {profile && (
        <section className="card p-6 md:p-7 space-y-5">
          <h2 className="text-2xl font-medium">Dane konta</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><dt className={term}>Imię i nazwisko</dt><dd className="mt-1 text-lg">{profile.firstName} {profile.lastName}</dd></div>
            <div><dt className={term}>E-mail</dt><dd className="mt-1 text-lg break-all">{profile.email}</dd></div>
            {isGuest && <div><dt className={term}>Telefon</dt><dd className="mt-1 text-lg">{profile.phoneNumber || '—'}</dd></div>}
            <div><dt className={term}>Konto od</dt><dd className="mt-1 text-lg">{formatDate(profile.registrationDate)}</dd></div>
          </dl>
        </section>
      )}

      {/* --- SKRÓTY I OPINIE --- */}
      {profile && !isGuest && (
        <div className="p-5 rounded-2xl bg-sand-100 flex flex-wrap justify-between items-center gap-4">
          <p className="text-slate-600">Zarządzanie pokojami, cennikiem, rezerwacjami i opiniami znajdziesz w panelu właściciela.</p>
          <button type="button" onClick={() => onNavigate('/panel')} className="btn-primary">Panel właściciela</button>
        </div>
      )}

      {profile && isGuest && (
        <section className="space-y-4">
          <div className="flex flex-wrap justify-between items-baseline gap-2">
            <h2 className="text-2xl font-medium">Moje opinie</h2>
            <button type="button" onClick={() => onNavigate('/moje-rezerwacje')} className="link text-sm">Moje rezerwacje →</button>
          </div>
          {reviews.map(r => (
            <div key={r.reviewId} className="border-b border-sand-200 pb-4 space-y-1">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold">{r.roomTypeName} <span className="font-normal text-sm text-slate-500">· rezerwacja #{r.reservationId}</span></span>
                <StarRating rating={r.rating} />
              </div>
              {r.comment && <p className="text-slate-600">{r.comment}</p>}
              <div className="text-xs text-slate-500">{formatDate(r.date)}</div>
            </div>
          ))}
          {reviews.length === 0 && <p className="p-5 rounded-2xl bg-sand-100 text-slate-600">Nie wystawiłeś jeszcze żadnej opinii. Opinię możesz dodać w szczegółach zakończonej rezerwacji.</p>}
        </section>
      )}
    </div>
  );
}
