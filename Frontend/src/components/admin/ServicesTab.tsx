// Plik: Frontend/src/components/admin/ServicesTab.tsx
import { useState, useEffect } from 'react';
import type { AdditionalServiceDto } from '../../types/admin';
import { getAdditionalServices, createAdditionalService, updateAdditionalService, deleteAdditionalService } from '../../api/adminApi';
import { errorMessage } from '../../api/apiErrors';
import Alert from '../Alert';

// Zakładka "Usługi Dodatkowe": usługi doliczane do rezerwacji (np. śniadanie, parking)
export default function ServicesTab({ token }: { token: string }) {
  const [services, setServices] = useState<AdditionalServiceDto[]>([]);
  const [newService, setNewService] = useState<AdditionalServiceDto>({ name: '', price: 0 });
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setServices(await getAdditionalServices());
      } catch (err) {
        setError(errorMessage(err));
      }
    };
    loadData();
  }, [reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text: string) => { setMessage(text); setError(''); };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServiceId) await updateAdditionalService(editingServiceId, newService, token); else await createAdditionalService(newService, token);
      showSuccess(editingServiceId ? 'Zmiany w usłudze zostały zapisane.' : 'Usługa została dodana.');
      setNewService({ name: '', price: 0 }); setEditingServiceId(null); reload();
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleEditService = (s: AdditionalServiceDto) => { setEditingServiceId(s.serviceId!); setNewService({ name: s.name, price: s.price }); };
  const handleCancelEditService = () => { setEditingServiceId(null); setNewService({ name: '', price: 0 }); };
  const handleDeleteService = async (id: number) => {
    if (!window.confirm('Na pewno usunąć usługę?')) return;
    try { await deleteAdditionalService(id, token); showSuccess('Usługa została usunięta.'); reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      {error && <Alert type="error" message={error} />}
      {message && !error && <Alert type="success" message={message} />}

      <div className="space-y-8">
        <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Nazwa usługi (np. Śniadanie)</label>
            <input type="text" required maxLength={100} value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Cena (PLN)</label>
            <input type="number" required min="0.01" max="100000" step="0.01" value={newService.price || ''} onChange={e => setNewService({...newService, price: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">{editingServiceId ? 'Zapisz Zmiany' : 'Dodaj Usługę'}</button>
            {editingServiceId && <button type="button" onClick={handleCancelEditService} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Anuluj</button>}
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                <th className="p-4 font-semibold">ID</th><th className="p-4 font-semibold">Nazwa</th>
                <th className="p-4 font-semibold">Cena</th><th className="p-4 font-semibold text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.serviceId} className="border-b hover:bg-slate-50">
                  <td className="p-4 text-slate-500">#{s.serviceId}</td><td className="p-4 font-medium text-slate-800">{s.name}</td>
                  <td className="p-4">{s.price} PLN</td>
                  <td className="p-4 text-right space-x-3"><button onClick={() => handleEditService(s)} className="text-slate-600 hover:text-slate-900 font-medium text-sm">Edytuj</button><button onClick={() => handleDeleteService(s.serviceId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}