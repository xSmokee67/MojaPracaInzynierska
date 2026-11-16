// Plik: Frontend/src/components/admin/PricingTab.jsx
import { useState, useEffect } from 'react';
import { getRoomTypes, getPriceListEntries, createPriceListEntry, updatePriceListEntry, deletePriceListEntry } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import { formatDate } from '../../utils/format';
import Alert from '../common/Alert';

// Zakładka "Cennik Sezonowy": ceny za noc dla typu pokoju w wybranym okresie
export default function PricingTab({ token }) {
  const [roomTypes, setRoomTypes] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [newPricing, setNewPricing] = useState({ roomTypeId: 0, startDate: '', endDate: '', pricePerNight: 0 });
  const [editingPricingId, setEditingPricingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const types = await getRoomTypes();
        setRoomTypes(types);
        // Domyślnie wybrany pierwszy typ pokoju w formularzu
        if (types.length > 0) setNewPricing(prev => prev.roomTypeId === 0 ? { ...prev, roomTypeId: types[0].roomTypeId } : prev);

        setPricing(await getPriceListEntries(token));
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [token, reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text) => { setMessage(text); setError(''); };

  const handleAddPricing = async (e) => {
    e.preventDefault();
    try {
      if (editingPricingId) await updatePriceListEntry(editingPricingId, newPricing, token); else await createPriceListEntry(newPricing, token);
      showSuccess(editingPricingId ? 'Zmiany w cenniku zostały zapisane.' : 'Cena sezonowa została dodana.');
      setNewPricing({ ...newPricing, startDate: '', endDate: '', pricePerNight: 0 }); setEditingPricingId(null); reload();
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleEditPricing = (p) => { setEditingPricingId(p.priceListEntryId); setNewPricing({ roomTypeId: p.roomTypeId, startDate: p.startDate.slice(0, 10), endDate: p.endDate.slice(0, 10), pricePerNight: p.pricePerNight }); };
  const handleCancelEditPricing = () => { setEditingPricingId(null); setNewPricing({ ...newPricing, startDate: '', endDate: '', pricePerNight: 0 }); };
  const handleDeletePricing = async (id) => {
    if (!window.confirm('Na pewno usunąć ten wpis z cennika?')) return;
    try { await deletePriceListEntry(id, token); showSuccess('Wpis z cennika został usunięty.'); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      {error && <Alert type="error" message={error} />}
      {message && !error && <Alert type="success" message={message} />}

      <div className="space-y-8">
        <form onSubmit={handleAddPricing} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-sand-100 p-4 md:p-5 rounded-2xl items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Typ pokoju</label>
            <select value={newPricing.roomTypeId} onChange={e => setNewPricing({...newPricing, roomTypeId: Number(e.target.value)})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900">
              {roomTypes.map(rt => <option key={rt.roomTypeId} value={rt.roomTypeId}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Od (Start)</label>
            <input type="date" required value={newPricing.startDate} onChange={e => setNewPricing({...newPricing, startDate: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Do (Koniec)</label>
            <input type="date" required min={newPricing.startDate} value={newPricing.endDate} onChange={e => setNewPricing({...newPricing, endDate: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Cena (zł/noc)</label>
            <input type="number" required min="0.01" max="100000" step="0.01" value={newPricing.pricePerNight || ''} onChange={e => setNewPricing({...newPricing, pricePerNight: Number(e.target.value)})} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-[10px] outline-none bg-white focus:border-navy-900" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="w-full py-2.5 bg-navy-900 text-white rounded-[10px] font-semibold hover:bg-navy-800 transition-colors">{editingPricingId ? 'Zapisz Zmiany' : 'Zapisz Cenę'}</button>
            {editingPricingId && <button type="button" onClick={handleCancelEditPricing} className="px-4 py-2.5 border border-slate-300 bg-white text-navy-900 rounded-[10px] font-semibold hover:border-navy-900">Anuluj</button>}
          </div>
        </form>

        <div className="overflow-x-auto card">
          <table className="data-table">
            <thead>
              <tr>
                <th className="px-4 py-3">Typ Pokoju</th><th className="px-4 py-3">Okres</th>
                <th className="px-4 py-3">Cena w sezonie</th><th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {pricing.map(p => (
                <tr key={p.priceListEntryId} className="hover:bg-sand-50">
                  <td className="px-4 py-3 font-medium">{p.roomTypeName}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.startDate)} - {formatDate(p.endDate)}</td>
                  <td className="px-4 py-3 font-semibold">{p.pricePerNight} zł</td>
                  <td className="px-4 py-3 text-right space-x-4 whitespace-nowrap"><button onClick={() => handleEditPricing(p)} className="text-navy-900 hover:text-brass-700 hover:underline font-semibold text-sm">Edytuj</button><button onClick={() => handleDeletePricing(p.priceListEntryId)} className="text-danger-800 hover:underline font-semibold text-sm">Usuń</button></td>
                </tr>
              ))}
              {pricing.length === 0 && <tr><td colSpan={4} className="px-4 py-5 text-center text-slate-500">Brak nadpisanych cen sezonowych.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}