// Plik: Frontend/src/components/admin/PricingTab.tsx
import { useState, useEffect } from 'react';
import type { RoomTypeDto, PriceListEntryDto } from '../../types/admin';
import { getRoomTypes, getPriceListEntries, createPriceListEntry, updatePriceListEntry, deletePriceListEntry } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';

// Zakładka "Cennik Sezonowy": ceny za noc dla typu pokoju w wybranym okresie
export default function PricingTab({ token }: { token: string }) {
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [pricing, setPricing] = useState<PriceListEntryDto[]>([]);
  const [newPricing, setNewPricing] = useState<PriceListEntryDto>({ roomTypeId: 0, startDate: '', endDate: '', pricePerNight: 0 });
  const [editingPricingId, setEditingPricingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const types = await getRoomTypes();
        setRoomTypes(types);
        // Domyślnie wybrany pierwszy typ pokoju w formularzu
        if (types.length > 0) setNewPricing(prev => prev.roomTypeId === 0 ? { ...prev, roomTypeId: types[0].roomTypeId! } : prev);

        setPricing(await getPriceListEntries(token));
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text: string) => { setMessage(text); setError(''); };

  const handleAddPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPricingId) await updatePriceListEntry(editingPricingId, newPricing, token); else await createPriceListEntry(newPricing, token);
      showSuccess(editingPricingId ? 'Zmiany w cenniku zostały zapisane.' : 'Cena sezonowa została dodana.');
      setNewPricing({ ...newPricing, startDate: '', endDate: '', pricePerNight: 0 }); setEditingPricingId(null); reload();
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleEditPricing = (p: PriceListEntryDto) => { setEditingPricingId(p.priceListEntryId!); setNewPricing({ roomTypeId: p.roomTypeId, startDate: p.startDate.slice(0, 10), endDate: p.endDate.slice(0, 10), pricePerNight: p.pricePerNight }); };
  const handleCancelEditPricing = () => { setEditingPricingId(null); setNewPricing({ ...newPricing, startDate: '', endDate: '', pricePerNight: 0 }); };
  const handleDeletePricing = async (id: number) => {
    if (!window.confirm('Na pewno usunąć ten wpis z cennika?')) return;
    try { await deletePriceListEntry(id, token); showSuccess('Wpis z cennika został usunięty.'); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
      {message && !error && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">{message}</div>}

      <div className="space-y-8">
        <form onSubmit={handleAddPricing} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Typ pokoju</label>
            <select value={newPricing.roomTypeId} onChange={e => setNewPricing({...newPricing, roomTypeId: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
              {roomTypes.map(rt => <option key={rt.roomTypeId} value={rt.roomTypeId}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Od (Start)</label>
            <input type="date" required value={newPricing.startDate} onChange={e => setNewPricing({...newPricing, startDate: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Do (Koniec)</label>
            <input type="date" required min={newPricing.startDate} value={newPricing.endDate} onChange={e => setNewPricing({...newPricing, endDate: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Cena (PLN/noc)</label>
            <input type="number" required min="0.01" max="100000" step="0.01" value={newPricing.pricePerNight || ''} onChange={e => setNewPricing({...newPricing, pricePerNight: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">{editingPricingId ? 'Zapisz Zmiany' : 'Zapisz Cenę'}</button>
            {editingPricingId && <button type="button" onClick={handleCancelEditPricing} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Anuluj</button>}
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                <th className="p-4 font-semibold">Typ Pokoju</th><th className="p-4 font-semibold">Okres</th>
                <th className="p-4 font-semibold">Cena w sezonie</th><th className="p-4 font-semibold text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {pricing.map(p => (
                <tr key={p.priceListEntryId} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800">{p.roomTypeName}</td>
                  <td className="p-4 text-slate-600">{new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}</td>
                  <td className="p-4 font-bold text-emerald-600">{p.pricePerNight} PLN</td>
                  <td className="p-4 text-right space-x-3"><button onClick={() => handleEditPricing(p)} className="text-slate-600 hover:text-slate-900 font-medium text-sm">Edytuj</button><button onClick={() => handleDeletePricing(p.priceListEntryId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                </tr>
              ))}
              {pricing.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Brak nadpisanych cen sezonowych.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}