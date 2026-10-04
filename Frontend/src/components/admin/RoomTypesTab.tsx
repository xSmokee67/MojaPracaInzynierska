// Plik: Frontend/src/components/admin/RoomTypesTab.tsx
import { useState, useEffect } from 'react';
import type { RoomTypeDto } from '../../types/admin';
import { getRoomTypes, createRoomType, updateRoomType, deleteRoomType } from '../../api/adminApi';
import { photoUrl } from '../../api/roomApi';
import { errorMessage } from '../../api/apiErrors';
import RoomTypePhotoManager from '../RoomTypePhotoManager';

const emptyRoomType: RoomTypeDto = { name: '', description: '', basePrice: 0, maxOccupancy: 1 };

// Zakładka "Typy Pokoi": dodawanie, edycja, usuwanie i zdjęcia typów pokoi
export default function RoomTypesTab({ token }: { token: string }) {
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [newRoomType, setNewRoomType] = useState<RoomTypeDto>(emptyRoomType);
  const [editingRoomTypeId, setEditingRoomTypeId] = useState<number | null>(null);
  const [photoRoomType, setPhotoRoomType] = useState<RoomTypeDto | null>(null);
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
  const showSuccess = (text: string) => { setMessage(text); setError(''); };

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoomTypeId) await updateRoomType(editingRoomTypeId, newRoomType, token); else await createRoomType(newRoomType, token);
      showSuccess(editingRoomTypeId ? 'Zmiany w typie pokoju zostały zapisane.' : 'Typ pokoju został dodany.');
      setNewRoomType(emptyRoomType); setEditingRoomTypeId(null); reload();
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleEditRoomType = (rt: RoomTypeDto) => { setEditingRoomTypeId(rt.roomTypeId!); setNewRoomType({ name: rt.name, description: rt.description, basePrice: rt.basePrice, maxOccupancy: rt.maxOccupancy }); };
  const handleCancelEditRoomType = () => { setEditingRoomTypeId(null); setNewRoomType(emptyRoomType); };
  const handleDeleteRoomType = async (id: number) => {
    if (!window.confirm('Na pewno usunąć ten typ pokoju?')) return;
    try { await deleteRoomType(id, token); showSuccess('Typ pokoju został usunięty.'); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
      {message && !error && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">{message}</div>}

      <div className="space-y-8">
        <form onSubmit={handleAddRoomType} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Nazwa typu</label>
            <input type="text" required maxLength={100} value={newRoomType.name} onChange={e => setNewRoomType({...newRoomType, name: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Cena bazowa (PLN)</label>
            <input type="number" required min="0.01" max="100000" step="0.01" value={newRoomType.basePrice || ''} onChange={e => setNewRoomType({...newRoomType, basePrice: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Max. gości</label>
            <input type="number" required min="1" max="20" value={newRoomType.maxOccupancy || ''} onChange={e => setNewRoomType({...newRoomType, maxOccupancy: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">{editingRoomTypeId ? 'Zapisz Zmiany' : 'Dodaj Typ Pokoju'}</button>
            {editingRoomTypeId && <button type="button" onClick={handleCancelEditRoomType} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Anuluj</button>}
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase">Opis (widoczny na stronie pokoju)</label>
            <textarea rows={3} maxLength={2000} value={newRoomType.description} onChange={e => setNewRoomType({...newRoomType, description: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                <th className="p-4 font-semibold">Zdjęcie</th><th className="p-4 font-semibold">Nazwa</th>
                <th className="p-4 font-semibold">Cena bazowa</th><th className="p-4 font-semibold">Max Gości</th><th className="p-4 font-semibold text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map(rt => (
                <tr key={rt.roomTypeId} className="border-b hover:bg-slate-50">
                  <td className="p-4">
                    <div className="w-20 h-14 rounded-md overflow-hidden bg-slate-200 flex items-center justify-center text-xs text-slate-400">
                      {rt.mainPhotoUrl ? <img src={photoUrl(rt.mainPhotoUrl)} alt={rt.name} className="w-full h-full object-cover" /> : 'brak'}
                    </div>
                  </td>
                  <td className="p-4"><div className="font-medium text-slate-800">{rt.name}</div><div className="text-xs text-slate-500">#{rt.roomTypeId} · zdjęć: {rt.photoCount ?? 0}</div></td>
                  <td className="p-4">{rt.basePrice} PLN</td><td className="p-4">{rt.maxOccupancy} os.</td>
                  <td className="p-4 text-right space-x-3"><button onClick={() => setPhotoRoomType(rt)} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm">Zdjęcia</button><button onClick={() => handleEditRoomType(rt)} className="text-slate-600 hover:text-slate-900 font-medium text-sm">Edytuj</button><button onClick={() => handleDeleteRoomType(rt.roomTypeId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {photoRoomType && (
        <RoomTypePhotoManager token={token} roomTypeId={photoRoomType.roomTypeId!} roomTypeName={photoRoomType.name} onClose={() => setPhotoRoomType(null)} onChanged={reload} />
      )}
    </>
  );
}