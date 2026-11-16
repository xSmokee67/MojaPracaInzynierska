// Plik: Frontend/src/components/admin/BlocksTab.jsx
import { useState, useEffect } from 'react';
import { getRooms, getRoomBlocks, createRoomBlock, deleteRoomBlock } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate, relocationsLabel } from '../../utils/format';
import Alert from '../common/Alert';

// Zakładka "Blokady": wyłączenie pokoju z rezerwacji na okres remontu lub konserwacji
export default function BlocksTab({ token }) {
  const [rooms, setRooms] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [newBlock, setNewBlock] = useState({ roomId: 0, startDate: '', endDate: '', reason: '' });
  const [blockRoomFilter, setBlockRoomFilter] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const roomsData = await getRooms(token);
        setRooms(roomsData);
        // Domyślnie wybrany pierwszy pokój w formularzu
        if (roomsData.length > 0) setNewBlock(prev => prev.roomId === 0 ? { ...prev, roomId: roomsData[0].roomId } : prev);

        setBlocks(await getRoomBlocks(token));
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text) => { setMessage(text); setError(''); };

  const handleAddBlock = async (e) => {
    e.preventDefault();
    // Rezerwacje nachodzące na blokadę API przenosi do innych pokoi tego typu i zwraca ich listę
    try { const result = await createRoomBlock(newBlock, token); showSuccess('Blokada pokoju została utworzona.' + relocationsLabel(result.relocated)); setNewBlock({ ...newBlock, startDate: '', endDate: '', reason: '' }); reload(); } catch (err) { setError(errorMessage(err)); }
  };
  const handleDeleteBlock = async (id) => {
    if (!window.confirm('Na pewno usunąć tę blokadę?')) return;
    try { await deleteRoomBlock(id, token); showSuccess('Blokada została usunięta.'); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  const visibleBlocks = blocks.filter(b => blockRoomFilter === 0 || b.roomId === blockRoomFilter);

  return (
    <>
      {error && <Alert type="error" message={error} />}
      {message && !error && <Alert type="success" message={message} />}

      <div className="space-y-8">
        <form onSubmit={handleAddBlock} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-sand-100 p-4 md:p-5 rounded-2xl items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Pokój</label>
            <select value={newBlock.roomId} onChange={e => setNewBlock({...newBlock, roomId: Number(e.target.value)})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900">
              {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.roomNumber} ({r.roomTypeName})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Od</label>
            <input type="date" required value={newBlock.startDate} onChange={e => setNewBlock({...newBlock, startDate: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Do (dzień zwolnienia)</label>
            <input type="date" required min={newBlock.startDate} value={newBlock.endDate} onChange={e => setNewBlock({...newBlock, endDate: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Powód</label>
            <input type="text" required maxLength={200} placeholder="np. remont" value={newBlock.reason} onChange={e => setNewBlock({...newBlock, reason: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div>
            <button type="submit" className="w-full py-2.5 bg-navy-900 text-white rounded-[10px] font-semibold hover:bg-navy-800 transition-colors">Zablokuj Pokój</button>
          </div>
        </form>
        <p className="-mt-6 text-xs text-slate-500">Rezerwacje w tym pokoju w okresie blokady zostaną przeniesione do innych wolnych pokoi tego samego typu. Jeśli któregoś gościa nie da się przenieść, blokada nie zostanie założona.</p>

        <div className="flex items-center gap-4">
          <label className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Pokaż blokady dla pokoju</label>
          <select value={blockRoomFilter} onChange={e => setBlockRoomFilter(Number(e.target.value))} className="px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900">
            <option value={0}>Wszystkie pokoje</option>
            {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.roomNumber}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto card">
          <table className="data-table">
            <thead>
              <tr>
                <th className="px-4 py-3">Pokój</th><th className="px-4 py-3">Okres</th>
                <th className="px-4 py-3">Powód</th><th className="px-4 py-3">Utworzył</th><th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {visibleBlocks.map(b => (
                <tr key={b.roomBlockId} className="hover:bg-sand-50">
                  <td className="px-4 py-3 font-semibold">{b.roomNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(b.startDate)} - {formatDate(b.endDate)}</td>
                  <td className="px-4 py-3 text-slate-600">{b.reason}</td>
                  <td className="px-4 py-3 text-slate-600">{b.ownerName}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteBlock(b.roomBlockId)} className="text-danger-800 hover:underline font-semibold text-sm">Usuń</button></td>
                </tr>
              ))}
              {visibleBlocks.length === 0 && <tr><td colSpan={5} className="px-4 py-5 text-center text-slate-500">Brak blokad.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}