// Plik: Frontend/src/components/admin/ReviewsTab.tsx
import { useState, useEffect } from 'react';
import type { ReviewDto } from '../../types/reservation';
import { getReviews, deleteReview } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';

// Zakładka "Opinie": moderacja opinii gości
export default function ReviewsTab({ token }: { token: string }) {
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setReviews(await getReviews());
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  const handleDeleteReview = async (id: number) => {
    if (!window.confirm('Na pewno usunąć tę opinię?')) return;
    try { await deleteReview(id, token); setMessage('Opinia została usunięta.'); setError(''); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
      {message && !error && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">{message}</div>}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-sm border-b">
              <th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Gość</th>
              <th className="p-4 font-semibold">Pobyt</th><th className="p-4 font-semibold">Ocena</th>
              <th className="p-4 font-semibold">Komentarz</th><th className="p-4 font-semibold text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(rv => (
              <tr key={rv.reviewId} className="border-b hover:bg-slate-50">
                <td className="p-4 text-slate-500">{new Date(rv.date!).toLocaleDateString()}</td>
                <td className="p-4 font-medium text-slate-800">{rv.guestName}</td>
                <td className="p-4 text-slate-600">#{rv.reservationId} ({rv.roomTypeName})</td>
                <td className="p-4 text-amber-500 whitespace-nowrap">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</td>
                <td className="p-4 text-slate-600">{rv.comment || '—'}</td>
                <td className="p-4 text-right"><button onClick={() => handleDeleteReview(rv.reviewId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
              </tr>
            ))}
            {reviews.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">Brak opinii.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}