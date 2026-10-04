// Plik: Frontend/src/components/admin/AmenitiesTab.tsx
import { useState, useEffect } from 'react';
import type { RoomDto, AmenityDto } from '../../types/admin';
import { getRooms, getAmenities, createAmenity, updateAmenity, deleteAmenity } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';

// Zakładka "Udogodnienia": słownik udogodnień przypisywanych do pokoi
export default function AmenitiesTab({ token }: { token: string }) {
  const [amenities, setAmenities] = useState<AmenityDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [newAmenity, setNewAmenity] = useState<AmenityDto>({ name: '' });
  const [editingAmenityId, setEditingAmenityId] = useState<number | null>(null);
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
  const showSuccess = (text: string) => { setMessage(text); setError(''); };

  const handleAddAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAmenityId) await updateAmenity(editingAmenityId, newAmenity, token); else await createAmenity(newAmenity, token);
      showSuccess(editingAmenityId ? 'Zmiany w udogodnieniu zostały zapisane.' : 'Udogodnienie zostało dodane.');
      setNewAmenity({ name: '' }); setEditingAmenityId(null); reload();
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleEditAmenity = (a: AmenityDto) => { setEditingAmenityId(a.amenityId!); setNewAmenity({ name: a.name }); };
  const handleCancelEditAmenity = () => { setEditingAmenityId(null); setNewAmenity({ name: '' }); };
  const handleDeleteAmenity = async (id: number) => {
    if (!window.confirm('Na pewno usunąć to udogodnienie? Zostanie odpięte od wszystkich pokoi.')) return;
    try { await deleteAmenity(id, token); showSuccess('Udogodnienie zostało usunięte.'); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
      {message && !error && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">{message}</div>}

      <div className="space-y-8">
        <form onSubmit={handleAddAmenity} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase">Nazwa udogodnienia (np. WiFi)</label>
            <input type="text" required maxLength={100} value={newAmenity.name} onChange={e => setNewAmenity({...newAmenity, name: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">{editingAmenityId ? 'Zapisz Zmiany' : 'Dodaj Udogodnienie'}</button>
            {editingAmenityId && <button type="button" onClick={handleCancelEditAmenity} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Anuluj</button>}
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                <th className="p-4 font-semibold">ID</th><th className="p-4 font-semibold">Nazwa</th>
                <th className="p-4 font-semibold">Liczba pokoi</th><th className="p-4 font-semibold text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {amenities.map(a => (
                <tr key={a.amenityId} className="border-b hover:bg-slate-50">
                  <td className="p-4 text-slate-500">#{a.amenityId}</td><td className="p-4 font-medium text-slate-800">{a.name}</td>
                  <td className="p-4 text-slate-600">{rooms.filter(r => r.amenityIds.includes(a.amenityId!)).length}</td>
                  <td className="p-4 text-right space-x-3"><button onClick={() => handleEditAmenity(a)} className="text-slate-600 hover:text-slate-900 font-medium text-sm">Edytuj</button><button onClick={() => handleDeleteAmenity(a.amenityId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                </tr>
              ))}
              {amenities.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Brak udogodnień.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}