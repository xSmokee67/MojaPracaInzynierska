// Plik: Frontend/src/components/admin/AmenitiesTab.jsx
import { useState, useEffect } from 'react';
import { getRooms, getAmenities, createAmenity, updateAmenity, deleteAmenity } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import Alert from '../common/Alert';

// Zakładka "Udogodnienia": słownik udogodnień przypisywanych do pokoi
export default function AmenitiesTab({ token }) {
  const [amenities, setAmenities] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [newAmenity, setNewAmenity] = useState({ name: '' });
  const [editingAmenityId, setEditingAmenityId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setAmenities(await getAmenities());
        // Pokoje potrzebne do kolumny "Liczba pokoi"
        setRooms(await getRooms(token));
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text) => { setMessage(text); setError(''); };

  const handleAddAmenity = async (e) => {
    e.preventDefault();
    try {
      if (editingAmenityId) await updateAmenity(editingAmenityId, newAmenity, token); else await createAmenity(newAmenity, token);
      showSuccess(editingAmenityId ? 'Zmiany w udogodnieniu zostały zapisane.' : 'Udogodnienie zostało dodane.');
      setNewAmenity({ name: '' }); setEditingAmenityId(null); reload();
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleEditAmenity = (a) => { setEditingAmenityId(a.amenityId); setNewAmenity({ name: a.name }); };
  const handleCancelEditAmenity = () => { setEditingAmenityId(null); setNewAmenity({ name: '' }); };
  const handleDeleteAmenity = async (id) => {
    if (!window.confirm('Na pewno usunąć to udogodnienie? Zostanie odpięte od wszystkich pokoi.')) return;
    try { await deleteAmenity(id, token); showSuccess('Udogodnienie zostało usunięte.'); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      {error && <Alert type="error" message={error} />}
      {message && !error && <Alert type="success" message={message} />}

      <div className="space-y-8">
        <form onSubmit={handleAddAmenity} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-sand-100 p-4 md:p-5 rounded-2xl items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Nazwa udogodnienia (np. WiFi)</label>
            <input type="text" required maxLength={100} value={newAmenity.name} onChange={e => setNewAmenity({...newAmenity, name: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="w-full py-2.5 bg-navy-900 text-white rounded-[10px] font-semibold hover:bg-navy-800 transition-colors">{editingAmenityId ? 'Zapisz Zmiany' : 'Dodaj Udogodnienie'}</button>
            {editingAmenityId && <button type="button" onClick={handleCancelEditAmenity} className="px-4 py-2.5 border border-slate-300 bg-white text-navy-900 rounded-[10px] font-semibold hover:border-navy-900">Anuluj</button>}
          </div>
        </form>

        <div className="overflow-x-auto card">
          <table className="data-table">
            <thead>
              <tr>
                <th className="px-4 py-3">ID</th><th className="px-4 py-3">Nazwa</th>
                <th className="px-4 py-3">Liczba pokoi</th><th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {amenities.map(a => (
                <tr key={a.amenityId} className="hover:bg-sand-50">
                  <td className="px-4 py-3 text-slate-500">#{a.amenityId}</td><td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600">{rooms.filter(r => r.amenityIds.includes(a.amenityId)).length}</td>
                  <td className="px-4 py-3 text-right space-x-4 whitespace-nowrap"><button onClick={() => handleEditAmenity(a)} className="text-navy-900 hover:text-brass-700 hover:underline font-semibold text-sm">Edytuj</button><button onClick={() => handleDeleteAmenity(a.amenityId)} className="text-danger-800 hover:underline font-semibold text-sm">Usuń</button></td>
                </tr>
              ))}
              {amenities.length === 0 && <tr><td colSpan={4} className="px-4 py-5 text-center text-slate-500">Brak udogodnień.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}