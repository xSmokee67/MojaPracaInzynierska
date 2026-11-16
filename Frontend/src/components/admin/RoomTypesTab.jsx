// Plik: Frontend/src/components/admin/RoomTypesTab.jsx
import { useState, useEffect } from 'react';
import { getRoomTypes, createRoomType, updateRoomType, deleteRoomType } from '../../api/adminApi';
import { photoUrl } from '../../api/roomApi';
import { errorMessage } from '../../api/apiErrors';
import RoomTypePhotoManager from './RoomTypePhotoManager';
import Alert from '../common/Alert';

const emptyRoomType = { name: '', description: '', basePrice: 0, maxOccupancy: 1, area: 0 };

// Zakładka "Typy Pokoi": dodawanie, edycja, usuwanie i zdjęcia typów pokoi
export default function RoomTypesTab({ token }) {
  const [roomTypes, setRoomTypes] = useState([]);
  const [newRoomType, setNewRoomType] = useState(emptyRoomType);
  const [editingRoomTypeId, setEditingRoomTypeId] = useState(null);
  const [photoRoomType, setPhotoRoomType] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setRoomTypes(await getRoomTypes());
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text) => { setMessage(text); setError(''); };

  const handleAddRoomType = async (e) => {
    e.preventDefault();
    try {
      if (editingRoomTypeId) await updateRoomType(editingRoomTypeId, newRoomType, token); else await createRoomType(newRoomType, token);
      showSuccess(editingRoomTypeId ? 'Zmiany w typie pokoju zostały zapisane.' : 'Typ pokoju został dodany.');
      setNewRoomType(emptyRoomType); setEditingRoomTypeId(null); reload();
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleEditRoomType = (rt) => { setEditingRoomTypeId(rt.roomTypeId); setNewRoomType({ name: rt.name, description: rt.description, basePrice: rt.basePrice, maxOccupancy: rt.maxOccupancy, area: rt.area }); };
  const handleCancelEditRoomType = () => { setEditingRoomTypeId(null); setNewRoomType(emptyRoomType); };
  const handleDeleteRoomType = async (id) => {
    if (!window.confirm('Na pewno usunąć ten typ pokoju?')) return;
    try { await deleteRoomType(id, token); showSuccess('Typ pokoju został usunięty.'); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      {error && <Alert type="error" message={error} />}
      {message && !error && <Alert type="success" message={message} />}

      <div className="space-y-8">
        <form onSubmit={handleAddRoomType} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-sand-100 p-4 md:p-5 rounded-2xl">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Nazwa typu</label>
            <input type="text" required maxLength={100} value={newRoomType.name} onChange={e => setNewRoomType({...newRoomType, name: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Cena bazowa (zł)</label>
            <input type="number" required min="0.01" max="100000" step="0.01" value={newRoomType.basePrice || ''} onChange={e => setNewRoomType({...newRoomType, basePrice: Number(e.target.value)})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Max. gości</label>
            <input type="number" required min="1" max="20" value={newRoomType.maxOccupancy || ''} onChange={e => setNewRoomType({...newRoomType, maxOccupancy: Number(e.target.value)})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Powierzchnia (m²)</label>
            <input type="number" required min="1" max="1000" value={newRoomType.area || ''} onChange={e => setNewRoomType({...newRoomType, area: Number(e.target.value)})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="w-full py-2.5 bg-navy-900 text-white rounded-[10px] font-semibold hover:bg-navy-800 transition-colors">{editingRoomTypeId ? 'Zapisz Zmiany' : 'Dodaj Typ Pokoju'}</button>
            {editingRoomTypeId && <button type="button" onClick={handleCancelEditRoomType} className="px-4 py-2.5 border border-slate-300 bg-white text-navy-900 rounded-[10px] font-semibold hover:border-navy-900">Anuluj</button>}
          </div>
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Opis (widoczny na stronie pokoju)</label>
            <textarea rows={3} maxLength={2000} value={newRoomType.description} onChange={e => setNewRoomType({...newRoomType, description: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
        </form>

        <div className="overflow-x-auto card">
          <table className="data-table">
            <thead>
              <tr>
                <th className="px-4 py-3">Zdjęcie</th><th className="px-4 py-3">Nazwa</th>
                <th className="px-4 py-3">Cena bazowa</th><th className="px-4 py-3">Max Gości / Powierzchnia</th><th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map(rt => (
                <tr key={rt.roomTypeId} className="hover:bg-sand-50">
                  <td className="px-4 py-3">
                    <div className="w-20 h-14 rounded-lg overflow-hidden bg-sand-100 flex items-center justify-center text-xs text-slate-400">
                      {rt.mainPhotoUrl ? <img src={photoUrl(rt.mainPhotoUrl)} alt={rt.name} className="w-full h-full object-cover" /> : 'brak'}
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="font-medium">{rt.name}</div><div className="text-xs text-slate-500">#{rt.roomTypeId} · zdjęć: {rt.photoCount ?? 0}</div></td>
                  <td className="px-4 py-3">{rt.basePrice} zł</td><td className="px-4 py-3">{rt.maxOccupancy} os. · {rt.area > 0 ? `${rt.area} m²` : '—'}</td>
                  <td className="px-4 py-3 text-right space-x-4 whitespace-nowrap"><button onClick={() => setPhotoRoomType(rt)} className="text-navy-900 hover:text-brass-700 hover:underline font-semibold text-sm">Zdjęcia</button><button onClick={() => handleEditRoomType(rt)} className="text-navy-900 hover:text-brass-700 hover:underline font-semibold text-sm">Edytuj</button><button onClick={() => handleDeleteRoomType(rt.roomTypeId)} className="text-danger-800 hover:underline font-semibold text-sm">Usuń</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {photoRoomType && (
        <RoomTypePhotoManager token={token} roomTypeId={photoRoomType.roomTypeId} roomTypeName={photoRoomType.name} onClose={() => setPhotoRoomType(null)} onChanged={reload} />
      )}
    </>
  );
}