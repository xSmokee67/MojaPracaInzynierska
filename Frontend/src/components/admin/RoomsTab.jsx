// Plik: Frontend/src/components/admin/RoomsTab.jsx
import { useState, useEffect } from 'react';
import { roomStatusLabels, roomStatusStyles } from '../../utils/statuses';
import { getRoomTypes, getRooms, getAmenities, createRoom, updateRoom, deleteRoom } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import { relocationsLabel } from '../../utils/format';
import Alert from '../common/Alert';

// Zakładka "Fizyczne Pokoje": pokoje z typem, statusem i udogodnieniami
export default function RoomsTab({ token }) {
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [newRoom, setNewRoom] = useState({ roomTypeId: 0, roomNumber: '', status: 'available', amenityIds: [] });
  const [editingRoomId, setEditingRoomId] = useState(null);
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
        if (types.length > 0) setNewRoom(prev => prev.roomTypeId === 0 ? { ...prev, roomTypeId: types[0].roomTypeId } : prev);

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
  const showSuccess = (text) => { setMessage(text); setError(''); };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      // Remont, wyłączenie lub zmiana typu pokoju: API przenosi przyszłe rezerwacje do innych pokoi i zwraca ich listę
      if (editingRoomId) {
        const result = await updateRoom(editingRoomId, newRoom, token);
        showSuccess('Zmiany w pokoju zostały zapisane.' + relocationsLabel(result.relocated));
      } else {
        await createRoom(newRoom, token);
        showSuccess('Pokój został dodany.');
      }
      setNewRoom({ ...newRoom, roomNumber: '', status: 'available', amenityIds: [] }); setEditingRoomId(null); reload();
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleEditRoom = (r) => { setEditingRoomId(r.roomId); setNewRoom({ roomTypeId: r.roomTypeId, roomNumber: r.roomNumber, status: r.status, amenityIds: r.amenityIds }); };
  const handleCancelEditRoom = () => { setEditingRoomId(null); setNewRoom({ ...newRoom, roomNumber: '', status: 'available', amenityIds: [] }); };
  const handleToggleRoomAmenity = (amenityId) => {
    setNewRoom(prev => ({ ...prev, amenityIds: prev.amenityIds.includes(amenityId) ? prev.amenityIds.filter(id => id !== amenityId) : [...prev.amenityIds, amenityId] }));
  };
  const handleDeleteRoom = async (room) => {
    if (!window.confirm('Na pewno usunąć ten pokój?')) return;
    try {
      await deleteRoom(room.roomId, token); showSuccess('Pokój został usunięty.'); reload();
    } catch (err) {
      const deleteError = errorMessage(err);
      // API nie usuwa pokoju z historią rezerwacji (płatności, faktury) - zamiast tego można go wyłączyć i ukryć z listy
      if (room.status !== 'disabled' && deleteError.startsWith('Nie można usunąć pokoju, który ma rezerwacje')
        && window.confirm(`Pokój ${room.roomNumber} ma rezerwacje, więc nie można go usunąć.\n\nWyłączyć go z użytku i ukryć z listy? Historia rezerwacji zostanie zachowana.`)) {
        try { const result = await updateRoom(room.roomId, { ...room, status: 'disabled' }, token); showSuccess(`Pokój ${room.roomNumber} został wyłączony i ukryty z listy.` + relocationsLabel(result.relocated)); reload(); } catch (updateErr) { setError(errorMessage(updateErr)); }
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
        <form onSubmit={handleAddRoom} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-sand-100 p-4 md:p-5 rounded-2xl">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Typ pokoju</label>
            <select value={newRoom.roomTypeId} onChange={e => setNewRoom({...newRoom, roomTypeId: Number(e.target.value)})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900">
              {roomTypes.map(rt => <option key={rt.roomTypeId} value={rt.roomTypeId}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Numer pokoju</label>
            <input type="text" required maxLength={10} value={newRoom.roomNumber} onChange={e => setNewRoom({...newRoom, roomNumber: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Status</label>
            <select value={newRoom.status} onChange={e => setNewRoom({...newRoom, status: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900">
              {Object.entries(roomStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {editingRoomId && <p className="mt-1 text-xs text-slate-500">„W remoncie”, „Wyłączony” albo zmiana typu przeniesie przyszłe rezerwacje do innych pokoi tego typu.</p>}
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="w-full py-2.5 bg-navy-900 text-white rounded-[10px] font-semibold hover:bg-navy-800 transition-colors">{editingRoomId ? 'Zapisz Zmiany' : 'Dodaj Pokój'}</button>
            {editingRoomId && <button type="button" onClick={handleCancelEditRoom} className="px-4 py-2.5 border border-slate-300 bg-white text-navy-900 rounded-[10px] font-semibold hover:border-navy-900">Anuluj</button>}
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Udogodnienia</label>
            <div className="flex flex-wrap gap-4 mt-2">
              {amenities.map(a => (
                <label key={a.amenityId} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={newRoom.amenityIds.includes(a.amenityId)} onChange={() => handleToggleRoomAmenity(a.amenityId)} className="accent-navy-900" />
                  {a.name}
                </label>
              ))}
              {amenities.length === 0 && <span className="text-sm text-slate-500">Brak udogodnień - dodaj je w zakładce Udogodnienia.</span>}
            </div>
          </div>
        </form>

        {rooms.some(r => r.status === 'disabled') && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showDisabledRooms} onChange={e => setShowDisabledRooms(e.target.checked)} className="accent-navy-900" />
            Pokaż wyłączone pokoje ({rooms.filter(r => r.status === 'disabled').length})
          </label>
        )}

        <div className="overflow-x-auto card">
          <table className="data-table">
            <thead>
              <tr>
                <th className="px-4 py-3">ID</th><th className="px-4 py-3">Numer pokoju</th>
                <th className="px-4 py-3">Przypisany Typ</th><th className="px-4 py-3">Udogodnienia</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rooms.filter(r => showDisabledRooms || r.status !== 'disabled').map(r => (
                <tr key={r.roomId} className={`hover:bg-sand-50 ${r.status === 'disabled' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 text-slate-500">#{r.roomId}</td><td className="px-4 py-3 font-semibold">{r.roomNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{r.roomTypeName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.amenityNames && r.amenityNames.length > 0 ? r.amenityNames.join(', ') : '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${roomStatusStyles[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{roomStatusLabels[r.status] ?? r.status}</span></td>
                  <td className="px-4 py-3 text-right space-x-4 whitespace-nowrap"><button onClick={() => handleEditRoom(r)} className="text-navy-900 hover:text-brass-700 hover:underline font-semibold text-sm">Edytuj</button><button onClick={() => handleDeleteRoom(r)} className="text-danger-800 hover:underline font-semibold text-sm">Usuń</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}