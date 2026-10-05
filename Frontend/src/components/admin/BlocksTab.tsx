// Plik: Frontend/src/components/admin/BlocksTab.tsx
import { useState, useEffect } from 'react';
import type { RoomDto, RoomBlockDto } from '../../types/admin';
import { getRooms, getRoomBlocks, createRoomBlock, deleteRoomBlock } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate } from '../../utils/format';
import Alert from '../Alert';

// Zakładka "Blokady": wyłączenie pokoju z rezerwacji na okres remontu lub konserwacji
export default function BlocksTab({ token }: { token: string }) {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [blocks, setBlocks] = useState<RoomBlockDto[]>([]);
  const [newBlock, setNewBlock] = useState<RoomBlockDto>({ roomId: 0, startDate: '', endDate: '', reason: '' });
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
        if (roomsData.length > 0) setNewBlock(prev => prev.roomId === 0 ? { ...prev, roomId: roomsData[0].roomId! } : prev);

        setBlocks(await getRoomBlocks(token));
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text: string) => { setMessage(text); setError(''); };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createRoomBlock(newBlock, token); showSuccess('Blokada pokoju została utworzona.'); setNewBlock({ ...newBlock, startDate: '', endDate: '', reason: '' }); reload(); } catch (err) { setError(errorMessage(err)); }
  };
  const handleDeleteBlock = async (id: number) => {
    if (!window.confirm('Na pewno usunąć tę blokadę?')) return;
    try { await deleteRoomBlock(id, token); showSuccess('Blokada została usunięta.'); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  const visibleBlocks = blocks.filter(b => blockRoomFilter === 0 || b.roomId === blockRoomFilter);

  return (
    <>
      {error && <Alert type="error" message={error} />}
      {message && !error && <Alert type="success" message={message} />}

      <div className="space-y-8">
        <form onSubmit={handleAddBlock} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Pokój</label>
            <select value={newBlock.roomId} onChange={e => setNewBlock({...newBlock, roomId: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
              {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.roomNumber} ({r.roomTypeName})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Od</label>
            <input type="date" required value={newBlock.startDate} onChange={e => setNewBlock({...newBlock, startDate: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Do (dzień zwolnienia)</label>
            <input type="date" required min={newBlock.startDate} value={newBlock.endDate} onChange={e => setNewBlock({...newBlock, endDate: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Powód</label>
            <input type="text" required maxLength={200} placeholder="np. remont" value={newBlock.reason} onChange={e => setNewBlock({...newBlock, reason: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Zablokuj Pokój</button>
          </div>
        </form>

        <div className="flex items-center gap-4">
          <label className="text-xs font-semibold text-slate-500 uppercase">Pokaż blokady dla pokoju</label>
          <select value={blockRoomFilter} onChange={e => setBlockRoomFilter(Number(e.target.value))} className="px-3 py-2 border rounded-lg outline-none bg-white">
            <option value={0}>Wszystkie pokoje</option>
            {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.roomNumber}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                <th className="p-4 font-semibold">Pokój</th><th className="p-4 font-semibold">Okres</th>
                <th className="p-4 font-semibold">Powód</th><th className="p-4 font-semibold">Utworzył</th><th className="p-4 font-semibold text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {visibleBlocks.map(b => (
                <tr key={b.roomBlockId} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-800">{b.roomNumber}</td>
                  <td className="p-4 text-slate-600">{formatDate(b.startDate)} - {formatDate(b.endDate)}</td>
                  <td className="p-4 text-slate-600">{b.reason}</td>
                  <td className="p-4 text-slate-600">{b.ownerName}</td>
                  <td className="p-4 text-right"><button onClick={() => handleDeleteBlock(b.roomBlockId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                </tr>
              ))}
              {visibleBlocks.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500">Brak blokad.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}