// Plik: Frontend/src/components/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import type { RoomTypeDto, RoomDto, AdditionalServiceDto, PriceListEntryDto } from '../types/admin';
import { 
  getRoomTypes, createRoomType, deleteRoomType, 
  getRooms, createRoom, deleteRoom,
  getAdditionalServices, createAdditionalService, deleteAdditionalService,
  getPriceListEntries, createPriceListEntry, deletePriceListEntry
} from '../api/adminApi';

export default function AdminDashboard({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<'roomTypes' | 'rooms' | 'services' | 'pricing'>('roomTypes');
  
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [services, setServices] = useState<AdditionalServiceDto[]>([]);
  const [pricing, setPricing] = useState<PriceListEntryDto[]>([]);
  const [error, setError] = useState('');

  // Stany dla formularzy
  const [newRoomType, setNewRoomType] = useState<RoomTypeDto>({ name: '', basePrice: 0, maxOccupancy: 1 });
  const [newRoom, setNewRoom] = useState<RoomDto>({ roomTypeId: 0, roomNumber: '', status: 'available' });
  const [newService, setNewService] = useState<AdditionalServiceDto>({ name: '', price: 0 });
  const [newPricing, setNewPricing] = useState<PriceListEntryDto>({ roomTypeId: 0, startDate: '', endDate: '', pricePerNight: 0 });

  const loadData = async () => {
    try {
      const types = await getRoomTypes();
      setRoomTypes(types);
      if (types.length > 0) {
        if (newRoom.roomTypeId === 0) setNewRoom(prev => ({ ...prev, roomTypeId: types[0].roomTypeId! }));
        if (newPricing.roomTypeId === 0) setNewPricing(prev => ({ ...prev, roomTypeId: types[0].roomTypeId! }));
      }
      
      const roomsData = await getRooms(token);
      setRooms(roomsData);

      const servicesData = await getAdditionalServices();
      setServices(servicesData);

      const pricingData = await getPriceListEntries(token);
      setPricing(pricingData);
      
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Handler dla Typów Pokoi
  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createRoomType(newRoomType, token); setNewRoomType({ name: '', basePrice: 0, maxOccupancy: 1 }); loadData(); } catch (err: any) { setError(err.message); }
  };
  const handleDeleteRoomType = async (id: number) => {
    if(!window.confirm('Na pewno usunąć ten typ pokoju?')) return;
    try { await deleteRoomType(id, token); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Pokoi
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createRoom(newRoom, token); setNewRoom({ ...newRoom, roomNumber: '' }); loadData(); } catch (err: any) { setError(err.message); }
  };
  const handleDeleteRoom = async (id: number) => {
    if(!window.confirm('Na pewno usunąć ten pokój?')) return;
    try { await deleteRoom(id, token); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Usług
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createAdditionalService(newService, token); setNewService({ name: '', price: 0 }); loadData(); } catch (err: any) { setError(err.message); }
  };
  const handleDeleteService = async (id: number) => {
    if(!window.confirm('Na pewno usunąć usługę?')) return;
    try { await deleteAdditionalService(id, token); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Cennika
  const handleAddPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createPriceListEntry(newPricing, token); setNewPricing({ ...newPricing, startDate: '', endDate: '', pricePerNight: 0 }); loadData(); } catch (err: any) { setError(err.message); }
  };
  const handleDeletePricing = async (id: number) => {
    if(!window.confirm('Na pewno usunąć ten wpis z cennika?')) return;
    try { await deletePriceListEntry(id, token); loadData(); } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="w-full max-w-6xl p-6 bg-white rounded-xl shadow-lg space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-3xl font-bold text-slate-800">Panel Właściciela</h2>
        <div className="space-x-2">
          <button onClick={() => setActiveTab('roomTypes')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'roomTypes' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Typy Pokoi</button>
          <button onClick={() => setActiveTab('rooms')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'rooms' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Fizyczne Pokoje</button>
          <button onClick={() => setActiveTab('pricing')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'pricing' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cennik Sezonowy</button>
          <button onClick={() => setActiveTab('services')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'services' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Usługi Dodatkowe</button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}

      {/* --- ZAKŁADKA 1: TYPY POKOI --- */}
      {activeTab === 'roomTypes' && (
        <div className="space-y-8">
          <form onSubmit={handleAddRoomType} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Nazwa typu</label>
              <input type="text" required value={newRoomType.name} onChange={e => setNewRoomType({...newRoomType, name: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Cena bazowa (PLN)</label>
              <input type="number" required min="1" value={newRoomType.basePrice || ''} onChange={e => setNewRoomType({...newRoomType, basePrice: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Max. gości</label>
              <input type="number" required min="1" value={newRoomType.maxOccupancy || ''} onChange={e => setNewRoomType({...newRoomType, maxOccupancy: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Dodaj Typ Pokoju</button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                  <th className="p-4 font-semibold">ID</th><th className="p-4 font-semibold">Nazwa</th>
                  <th className="p-4 font-semibold">Cena bazowa</th><th className="p-4 font-semibold">Max Gości</th><th className="p-4 font-semibold text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map(rt => (
                  <tr key={rt.roomTypeId} className="border-b hover:bg-slate-50">
                    <td className="p-4 text-slate-500">#{rt.roomTypeId}</td><td className="p-4 font-medium text-slate-800">{rt.name}</td>
                    <td className="p-4">{rt.basePrice} PLN</td><td className="p-4">{rt.maxOccupancy} os.</td>
                    <td className="p-4 text-right"><button onClick={() => handleDeleteRoomType(rt.roomTypeId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ZAKŁADKA 2: POKOJE FIZYCZNE --- */}
      {activeTab === 'rooms' && (
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
              <input type="text" required value={newRoom.roomNumber} onChange={e => setNewRoom({...newRoom, roomNumber: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Status</label>
              <select value={newRoom.status} onChange={e => setNewRoom({...newRoom, status: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
                <option value="available">Dostępny</option><option value="maintenance">W remoncie</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Dodaj Pokój</button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                  <th className="p-4 font-semibold">ID</th><th className="p-4 font-semibold">Numer pokoju</th>
                  <th className="p-4 font-semibold">Przypisany Typ</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.roomId} className="border-b hover:bg-slate-50">
                    <td className="p-4 text-slate-500">#{r.roomId}</td><td className="p-4 font-bold text-slate-800">{r.roomNumber}</td>
                    <td className="p-4 text-slate-600">{r.roomTypeName}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${r.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span></td>
                    <td className="p-4 text-right"><button onClick={() => handleDeleteRoom(r.roomId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ZAKŁADKA 3: CENNIK SEZONOWY --- */}
      {activeTab === 'pricing' && (
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
              <input type="date" required value={newPricing.endDate} onChange={e => setNewPricing({...newPricing, endDate: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Cena (PLN/noc)</label>
              <input type="number" required min="1" value={newPricing.pricePerNight || ''} onChange={e => setNewPricing({...newPricing, pricePerNight: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Zapisz Cenę</button>
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
                    <td className="p-4 text-right"><button onClick={() => handleDeletePricing(p.priceListEntryId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                  </tr>
                ))}
                {pricing.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Brak nadpisanych cen sezonowych.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ZAKŁADKA 4: USŁUGI DODATKOWE --- */}
      {activeTab === 'services' && (
        <div className="space-y-8">
          <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Nazwa usługi (np. Śniadanie)</label>
              <input type="text" required value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Cena (PLN)</label>
              <input type="number" required min="1" value={newService.price || ''} onChange={e => setNewService({...newService, price: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Dodaj Usługę</button>
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
                    <td className="p-4 text-right"><button onClick={() => handleDeleteService(s.serviceId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}