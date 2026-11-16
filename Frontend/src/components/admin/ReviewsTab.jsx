// Plik: Frontend/src/components/admin/ReviewsTab.jsx
import { useState, useEffect } from 'react';
import { getReviews, deleteReview } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate } from '../../utils/format';
import Alert from '../common/Alert';
import StarRating from '../common/StarRating';

// Zakładka "Opinie": moderacja opinii gości
export default function ReviewsTab({ token }) {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setReviews(await getReviews(token));
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Na pewno usunąć tę opinię?')) return;
    try { await deleteReview(id, token); setMessage('Opinia została usunięta.'); setError(''); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      {error && <Alert type="error" message={error} />}
      {message && !error && <Alert type="success" message={message} />}

      <div className="overflow-x-auto card">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-4 py-3">Data</th><th className="px-4 py-3">Gość</th>
              <th className="px-4 py-3">Pobyt</th><th className="px-4 py-3">Ocena</th>
              <th className="px-4 py-3">Komentarz</th><th className="px-4 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(rv => (
              <tr key={rv.reviewId} className="hover:bg-sand-50">
                <td className="px-4 py-3 text-slate-500">{formatDate(rv.date)}</td>
                <td className="px-4 py-3 font-medium">{rv.guestName}</td>
                <td className="px-4 py-3 text-slate-600">#{rv.reservationId} ({rv.roomTypeName})</td>
                <td className="px-4 py-3"><StarRating rating={rv.rating} /></td>
                <td className="px-4 py-3 text-slate-600">{rv.comment || '—'}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteReview(rv.reviewId)} className="text-danger-800 hover:underline font-semibold text-sm">Usuń</button></td>
              </tr>
            ))}
            {reviews.length === 0 && <tr><td colSpan={6} className="px-4 py-5 text-center text-slate-500">Brak opinii.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}