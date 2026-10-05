// Plik: Frontend/src/components/admin/RoomsTab.tsx
import { useState, useEffect } from 'react';
import type { RoomTypeDto, RoomDto, AmenityDto } from '../../types/admin';
import { roomStatusLabels, roomStatusStyles } from '../../types/admin';
import { getRoomTypes, getRooms, getAmenities, createRoom, updateRoom, deleteRoom } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import Alert from '../Alert';

// Zakładka "Fizyczne Pokoje": pokoje z typem, statusem i udogodnieniami
export default function RoomsTab({ token }: { token: string }) {
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [amenities, setAmenities] = useState<AmenityDto[]>([]);
  const [newRoom, setNewRoom] = useState<RoomDto>({ roomTypeId: 0, roomNumber: '', status: 'available', amenityIds: [] });
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [showDisabledRooms, setShowDisabledRooms] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const types = await getRoomTypes();
        setRoomTypes(types);
        // Domyślnie wybrany pierwszy typ pokoju w formularzu
        if (types.length > 0) setNewRoom(prev => prev.roomTypeId === 0 ? { ...prev, roomTypeId: types[0].roomTypeId! } : prev);

        setRooms(await getRooms(token));
        setAmenities(await getAmenities());
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text: string) => { setMessage(text); setError(''); };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoomId) await updateRoom(editingRoomId, newRoom, token); else await createRoom(newRoom, token);
      showSuccess(editingRoomId ? 'Zmiany w pokoju zostały zapisane.' : 'Pokój został dodany.');
      setNewRoom({ ...newRoom, roomNumber: '', status: 'available', amenityIds: [] }); setEditingRoomId(null); reload();
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleEditRoom = (r: RoomDto) => { setEditingRoomId(r.roomId!); setNewRoom({ roomTypeId: r.roomTypeId, roomNumber: r.roomNumber, status: r.status, amenityIds: r.amenityIds }); };
  const handleCancelEditRoom = () => { setEditingRoomId(null); setNewRoom({ ...newRoom, roomNumber: '', status: 'available', amenityIds: [] }); };
  const handleToggleRoomAmenity = (amenityId: number) => {
    setNewRoom(prev => ({ ...prev, amenityIds: prev.amenityIds.includes(amenityId) ? prev.amenityIds.filter(id => id !== amenityId) : [...prev.amenityIds, amenityId] }));
  };
  const handleDeleteRoom = async (room: RoomDto) => {
    if (!window.confirm('Na pewno usunąć ten pokój?')) return;
    try {
      await deleteRoom(room.roomId!, token); showSuccess('Pokój został usunięty.'); reload();
    } catch (err) {
      const deleteError = errorMessage(err);
      // API nie usuwa pokoju z historią rezerwacji (płatności, faktury) - zamiast tego można go wyłączyć i ukryć z listy
      if (room.status !== 'disabled' && deleteError.startsWith('Nie można usunąć pokoju, który ma rezerwacje')
        && window.confirm(`Pokój ${room.roomNumber} ma rezerwacje, więc nie można go usunąć.\n\nWyłączyć go z użytku i ukryć z listy? Historia rezerwacji zostanie zachowana.`)) {
        try { await updateRoom(room.roomId!, { ...room, status: 'disabled' }, token); showSuccess(`Pokój ${room.roomNumber} został wyłączony i ukryty z listy.`); reload(); } catch (updateErr) { setError(errorMessage(updateErr)); }
        return;
      }
      setError(deleteError);
    }
  };

  return (
    <>
      {error && <Alert type="error" message={error} />}
      {message && !error && <Alert type="success" message={message} />}

      <div className="space-y-8">
        <form onSubmit={handleAddRoom} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Typ pokoju</label>
            <select value={newRoom.roomTypeId} onChange={e => setNewRoom({...newRoom, roomTypeId: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
              {roomTypes.map(rt => <option key={rt.roomTypeId} value={rt.roomTypeId}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Numer pokoju</label>
            <input type="text" required maxLength={10} value={newRoom.roomNumber} onChange={e => setNewRoom({...newRoom, roomNumber: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Status</label>
            <select value={newRoom.status} onChange={e => setNewRoom({...newRoom, status: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
              {Object.entries(roomStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">{editingRoomId ? 'Zapisz Zmiany' : 'Dodaj Pokój'}</button>
            {editingRoomId && <button type="button" onClick={handleCancelEditRoom} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Anuluj</button>}
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase">Udogodnienia</label>
            <div className="flex flex-wrap gap-4 mt-2">
              {amenities.map(a => (
                <label key={a.amenityId} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={newRoom.amenityIds.includes(a.amenityId!)} onChange={() => handleToggleRoomAmenity(a.amenityId!)} className="accent-emerald-600" />
                  {a.name}
                </label>
              ))}
              {amenities.length === 0 && <span className="text-sm text-slate-500">Brak udogodnień - dodaj je w zakładce Udogodnienia.</span>}
            </div>
          </div>
        </form>

        {rooms.some(r => r.status === 'disabled') && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showDisabledRooms} onChange={e => setShowDisabledRooms(e.target.checked)} className="accent-emerald-600" />
            Pokaż wyłączone pokoje ({rooms.filter(r => r.status === 'disabled').length})
          </label>
        )}

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                <th className="p-4 font-semibold">ID</th><th className="p-4 font-semibold">Numer pokoju</th>
                <th className="p-4 font-semibold">Przypisany Typ</th><th className="p-4 font-semibold">Udogodnienia</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rooms.filter(r => showDisabledRooms || r.status !== 'disabled').map(r => (
                <tr key={r.roomId} className={`border-b hover:bg-slate-50 ${r.status === 'disabled' ? 'opacity-60' : ''}`}>
                  <td className="p-4 text-slate-500">#{r.roomId}</td><td className="p-4 font-bold text-slate-800">{r.roomNumber}</td>
                  <td className="p-4 text-slate-600">{r.roomTypeName}</td>
                  <td className="p-4 text-slate-600 text-sm">{r.amenityNames && r.amenityNames.length > 0 ? r.amenityNames.join(', ') : '—'}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${roomStatusStyles[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{roomStatusLabels[r.status] ?? r.status}</span></td>
                  <td className="p-4 text-right space-x-3"><button onClick={() => handleEditRoom(r)} className="text-slate-600 hover:text-slate-900 font-medium text-sm">Edytuj</button><button onClick={() => handleDeleteRoom(r)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}