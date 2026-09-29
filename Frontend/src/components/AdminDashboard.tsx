// Plik: Frontend/src/components/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import type { RoomTypeDto, RoomDto, AdditionalServiceDto, PriceListEntryDto, AmenityDto, RoomBlockDto } from '../types/admin';
import type { ReservationDto, ReviewDto } from '../types/reservation';
import { reservationStatusLabels, reservationStatusStyles } from '../types/reservation';
import { 
  getRoomTypes, createRoomType, updateRoomType, deleteRoomType, 
  getRooms, createRoom, updateRoom, deleteRoom,
  getAdditionalServices, createAdditionalService, updateAdditionalService, deleteAdditionalService,
  getPriceListEntries, createPriceListEntry, updatePriceListEntry, deletePriceListEntry,
  getAmenities, createAmenity, updateAmenity, deleteAmenity,
  getRoomBlocks, createRoomBlock, deleteRoomBlock,
  getReviews, deleteReview
} from '../api/adminApi';
import { getAllReservations, updateReservationStatus } from '../api/reservationApi';
import ReservationDetails from './ReservationDetails';

export default function AdminDashboard({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<'roomTypes' | 'rooms' | 'amenities' | 'services' | 'pricing' | 'blocks' | 'reservations' | 'reviews'>('roomTypes');
  
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [services, setServices] = useState<AdditionalServiceDto[]>([]);
  const [pricing, setPricing] = useState<PriceListEntryDto[]>([]);
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [amenities, setAmenities] = useState<AmenityDto[]>([]);
  const [blocks, setBlocks] = useState<RoomBlockDto[]>([]);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Stany dla formularzy
  const [newRoomType, setNewRoomType] = useState<RoomTypeDto>({ name: '', basePrice: 0, maxOccupancy: 1 });
  const [newRoom, setNewRoom] = useState<RoomDto>({ roomTypeId: 0, roomNumber: '', status: 'available', amenityIds: [] });
  const [newService, setNewService] = useState<AdditionalServiceDto>({ name: '', price: 0 });
  const [newPricing, setNewPricing] = useState<PriceListEntryDto>({ roomTypeId: 0, startDate: '', endDate: '', pricePerNight: 0 });
  const [newAmenity, setNewAmenity] = useState<AmenityDto>({ name: '' });
  const [newBlock, setNewBlock] = useState<RoomBlockDto>({ roomId: 0, startDate: '', endDate: '', reason: '' });

  // Stany dla edycji (null = tryb dodawania)
  const [editingRoomTypeId, setEditingRoomTypeId] = useState<number | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [editingPricingId, setEditingPricingId] = useState<number | null>(null);
  const [editingAmenityId, setEditingAmenityId] = useState<number | null>(null);

  // Szczegóły rezerwacji (okno) i filtr blokad po pokoju
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
  const [blockRoomFilter, setBlockRoomFilter] = useState(0);

  // Stany dla filtrów rezerwacji
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [guestFilter, setGuestFilter] = useState('');

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
      if (roomsData.length > 0 && newBlock.roomId === 0) setNewBlock(prev => ({ ...prev, roomId: roomsData[0].roomId! }));

      const servicesData = await getAdditionalServices();
      setServices(servicesData);

      const pricingData = await getPriceListEntries(token);
      setPricing(pricingData);

      const reservationsData = await getAllReservations(token);
      setReservations(reservationsData);

      const amenitiesData = await getAmenities();
      setAmenities(amenitiesData);

      const blocksData = await getRoomBlocks(token);
      setBlocks(blocksData);

      const reviewsData = await getReviews();
      setReviews(reviewsData);
      
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Nazwy zakładek do okruszków (breadcrumbs)
  const tabLabels: Record<typeof activeTab, string> = {
    roomTypes: 'Typy pokoi', rooms: 'Fizyczne pokoje', amenities: 'Udogodnienia', pricing: 'Cennik sezonowy',
    services: 'Usługi dodatkowe', blocks: 'Blokady pokoi', reservations: 'Rezerwacje', reviews: 'Opinie'
  };

  // Komunikat sukcesu po akcji (błąd z poprzedniej akcji jest czyszczony)
  const showSuccess = (text: string) => { setMessage(text); setError(''); };

  // Zmiana zakładki czyści komunikaty z poprzedniej zakładki
  const changeTab = (tab: typeof activeTab) => { setActiveTab(tab); setMessage(''); setError(''); };

  // Handler dla Typów Pokoi
  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoomTypeId) await updateRoomType(editingRoomTypeId, newRoomType, token); else await createRoomType(newRoomType, token);
      showSuccess(editingRoomTypeId ? 'Zmiany w typie pokoju zostały zapisane.' : 'Typ pokoju został dodany.');
      setNewRoomType({ name: '', basePrice: 0, maxOccupancy: 1 }); setEditingRoomTypeId(null); loadData();
    } catch (err: any) { setError(err.message); }
  };
  const handleEditRoomType = (rt: RoomTypeDto) => { setEditingRoomTypeId(rt.roomTypeId!); setNewRoomType({ name: rt.name, basePrice: rt.basePrice, maxOccupancy: rt.maxOccupancy }); };
  const handleCancelEditRoomType = () => { setEditingRoomTypeId(null); setNewRoomType({ name: '', basePrice: 0, maxOccupancy: 1 }); };
  const handleDeleteRoomType = async (id: number) => {
    if(!window.confirm('Na pewno usunąć ten typ pokoju?')) return;
    try { await deleteRoomType(id, token); showSuccess('Typ pokoju został usunięty.'); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Pokoi
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoomId) await updateRoom(editingRoomId, newRoom, token); else await createRoom(newRoom, token);
      showSuccess(editingRoomId ? 'Zmiany w pokoju zostały zapisane.' : 'Pokój został dodany.');
      setNewRoom({ ...newRoom, roomNumber: '', status: 'available', amenityIds: [] }); setEditingRoomId(null); loadData();
    } catch (err: any) { setError(err.message); }
  };
  const handleEditRoom = (r: RoomDto) => { setEditingRoomId(r.roomId!); setNewRoom({ roomTypeId: r.roomTypeId, roomNumber: r.roomNumber, status: r.status, amenityIds: r.amenityIds }); };
  const handleCancelEditRoom = () => { setEditingRoomId(null); setNewRoom({ ...newRoom, roomNumber: '', status: 'available', amenityIds: [] }); };
  const handleToggleRoomAmenity = (amenityId: number) => {
    setNewRoom(prev => ({ ...prev, amenityIds: prev.amenityIds.includes(amenityId) ? prev.amenityIds.filter(id => id !== amenityId) : [...prev.amenityIds, amenityId] }));
  };
  const handleDeleteRoom = async (id: number) => {
    if(!window.confirm('Na pewno usunąć ten pokój?')) return;
    try { await deleteRoom(id, token); showSuccess('Pokój został usunięty.'); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Usług
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServiceId) await updateAdditionalService(editingServiceId, newService, token); else await createAdditionalService(newService, token);
      showSuccess(editingServiceId ? 'Zmiany w usłudze zostały zapisane.' : 'Usługa została dodana.');
      setNewService({ name: '', price: 0 }); setEditingServiceId(null); loadData();
    } catch (err: any) { setError(err.message); }
  };
  const handleEditService = (s: AdditionalServiceDto) => { setEditingServiceId(s.serviceId!); setNewService({ name: s.name, price: s.price }); };
  const handleCancelEditService = () => { setEditingServiceId(null); setNewService({ name: '', price: 0 }); };
  const handleDeleteService = async (id: number) => {
    if(!window.confirm('Na pewno usunąć usługę?')) return;
    try { await deleteAdditionalService(id, token); showSuccess('Usługa została usunięta.'); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Cennika
  const handleAddPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPricingId) await updatePriceListEntry(editingPricingId, newPricing, token); else await createPriceListEntry(newPricing, token);
      showSuccess(editingPricingId ? 'Zmiany w cenniku zostały zapisane.' : 'Cena sezonowa została dodana.');
      setNewPricing({ ...newPricing, startDate: '', endDate: '', pricePerNight: 0 }); setEditingPricingId(null); loadData();
    } catch (err: any) { setError(err.message); }
  };
  const handleEditPricing = (p: PriceListEntryDto) => { setEditingPricingId(p.priceListEntryId!); setNewPricing({ roomTypeId: p.roomTypeId, startDate: p.startDate.slice(0, 10), endDate: p.endDate.slice(0, 10), pricePerNight: p.pricePerNight }); };
  const handleCancelEditPricing = () => { setEditingPricingId(null); setNewPricing({ ...newPricing, startDate: '', endDate: '', pricePerNight: 0 }); };
  const handleDeletePricing = async (id: number) => {
    if(!window.confirm('Na pewno usunąć ten wpis z cennika?')) return;
    try { await deletePriceListEntry(id, token); showSuccess('Wpis z cennika został usunięty.'); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Udogodnień
  const handleAddAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAmenityId) await updateAmenity(editingAmenityId, newAmenity, token); else await createAmenity(newAmenity, token);
      showSuccess(editingAmenityId ? 'Zmiany w udogodnieniu zostały zapisane.' : 'Udogodnienie zostało dodane.');
      setNewAmenity({ name: '' }); setEditingAmenityId(null); loadData();
    } catch (err: any) { setError(err.message); }
  };
  const handleEditAmenity = (a: AmenityDto) => { setEditingAmenityId(a.amenityId!); setNewAmenity({ name: a.name }); };
  const handleCancelEditAmenity = () => { setEditingAmenityId(null); setNewAmenity({ name: '' }); };
  const handleDeleteAmenity = async (id: number) => {
    if(!window.confirm('Na pewno usunąć to udogodnienie? Zostanie odpięte od wszystkich pokoi.')) return;
    try { await deleteAmenity(id, token); showSuccess('Udogodnienie zostało usunięte.'); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Blokad
  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createRoomBlock(newBlock, token); showSuccess('Blokada pokoju została utworzona.'); setNewBlock({ ...newBlock, startDate: '', endDate: '', reason: '' }); loadData(); } catch (err: any) { setError(err.message); }
  };
  const handleDeleteBlock = async (id: number) => {
    if(!window.confirm('Na pewno usunąć tę blokadę?')) return;
    try { await deleteRoomBlock(id, token); showSuccess('Blokada została usunięta.'); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Opinii (moderacja)
  const handleDeleteReview = async (id: number) => {
    if(!window.confirm('Na pewno usunąć tę opinię?')) return;
    try { await deleteReview(id, token); showSuccess('Opinia została usunięta.'); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Handler dla Rezerwacji
  const handleChangeStatus = async (id: number, status: string) => {
    if (status === 'cancelled' && !window.confirm('Na pewno anulować tę rezerwację? Tej operacji nie można cofnąć.')) return;
    try { await updateReservationStatus(id, { status }, token); showSuccess(`Status rezerwacji #${id} został zmieniony.`); loadData(); } catch (err: any) { setError(err.message); }
  };

  // Filtrowanie rezerwacji po statusie, dacie (pobyt obejmujący wybrany dzień) i gościu
  const filteredReservations = reservations.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (dateFilter && (r.checkInDate.slice(0, 10) > dateFilter || r.checkOutDate.slice(0, 10) < dateFilter)) return false;
    if (guestFilter && !`${r.guestName} ${r.guestEmail}`.toLowerCase().includes(guestFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="w-full max-w-6xl p-4 md:p-6 bg-white rounded-xl shadow-lg space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <h2 className="text-3xl font-bold text-slate-800">Panel Właściciela</h2>
        <div className="flex flex-wrap md:justify-end gap-2">
          <button onClick={() => changeTab('roomTypes')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'roomTypes' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Typy Pokoi</button>
          <button onClick={() => changeTab('rooms')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'rooms' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Fizyczne Pokoje</button>
          <button onClick={() => changeTab('amenities')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'amenities' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Udogodnienia</button>
          <button onClick={() => changeTab('pricing')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'pricing' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cennik Sezonowy</button>
          <button onClick={() => changeTab('services')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'services' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Usługi Dodatkowe</button>
          <button onClick={() => changeTab('blocks')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'blocks' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Blokady</button>
          <button onClick={() => changeTab('reservations')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'reservations' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Rezerwacje</button>
          <button onClick={() => changeTab('reviews')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'reviews' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Opinie</button>
        </div>
      </div>

      <nav className="text-sm text-slate-500">
        <span>Panel Właściciela</span>
        <span className="mx-2">›</span>
        <span className="font-semibold text-slate-800">{tabLabels[activeTab]}</span>
        {selectedReservationId && activeTab === 'reservations' && (<><span className="mx-2">›</span><span className="font-semibold text-slate-800">Rezerwacja #{selectedReservationId}</span></>)}
      </nav>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
      {message && !error && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">{message}</div>}

      {/* --- ZAKŁADKA 1: TYPY POKOI --- */}
      {activeTab === 'roomTypes' && (
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
                    <td className="p-4 text-right space-x-3"><button onClick={() => handleEditRoomType(rt)} className="text-slate-600 hover:text-slate-900 font-medium text-sm">Edytuj</button><button onClick={() => handleDeleteRoomType(rt.roomTypeId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
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
              <input type="text" required maxLength={10} value={newRoom.roomNumber} onChange={e => setNewRoom({...newRoom, roomNumber: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Status</label>
              <select value={newRoom.status} onChange={e => setNewRoom({...newRoom, status: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
                <option value="available">Dostępny</option><option value="cleaning">Sprzątanie</option><option value="maintenance">W remoncie</option><option value="disabled">Wyłączony</option>
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

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                  <th className="p-4 font-semibold">ID</th><th className="p-4 font-semibold">Numer pokoju</th>
                  <th className="p-4 font-semibold">Przypisany Typ</th><th className="p-4 font-semibold">Udogodnienia</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.roomId} className="border-b hover:bg-slate-50">
                    <td className="p-4 text-slate-500">#{r.roomId}</td><td className="p-4 font-bold text-slate-800">{r.roomNumber}</td>
                    <td className="p-4 text-slate-600">{r.roomTypeName}</td>
                    <td className="p-4 text-slate-600 text-sm">{r.amenityNames && r.amenityNames.length > 0 ? r.amenityNames.join(', ') : '—'}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${r.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span></td>
                    <td className="p-4 text-right space-x-3"><button onClick={() => handleEditRoom(r)} className="text-slate-600 hover:text-slate-900 font-medium text-sm">Edytuj</button><button onClick={() => handleDeleteRoom(r.roomId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
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
      )}

      {/* --- ZAKŁADKA 4: USŁUGI DODATKOWE --- */}
      {activeTab === 'services' && (
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
      )}
      {/* --- ZAKŁADKA 5: REZERWACJE --- */}
      {activeTab === 'reservations' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none bg-white">
                <option value="all">Wszystkie</option>
                {Object.entries(reservationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Pobyt w dniu</label>
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Gość (imię, nazwisko, e-mail)</label>
              <input type="text" value={guestFilter} onChange={e => setGuestFilter(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <button type="button" onClick={() => { setStatusFilter('all'); setDateFilter(''); setGuestFilter(''); }} className="w-full py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Wyczyść filtry</button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                  <th className="p-4 font-semibold">Nr</th><th className="p-4 font-semibold">Gość</th>
                  <th className="p-4 font-semibold">Pokój</th><th className="p-4 font-semibold">Termin pobytu</th>
                  <th className="p-4 font-semibold">Cena</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Zmień status</th><th className="p-4 font-semibold text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map(r => (
                  <tr key={r.reservationId} className="border-b hover:bg-slate-50">
                    <td className="p-4 text-slate-500">#{r.reservationId}</td>
                    <td className="p-4"><div className="font-medium text-slate-800">{r.guestName}</div><div className="text-xs text-slate-500">{r.guestEmail}</div></td>
                    <td className="p-4"><span className="font-bold text-slate-800">{r.roomNumber}</span> <span className="text-slate-600">({r.roomTypeName})</span></td>
                    <td className="p-4 text-slate-600">{new Date(r.checkInDate).toLocaleDateString()} - {new Date(r.checkOutDate).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-emerald-600">{r.totalPrice.toFixed(2)} PLN</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${reservationStatusStyles[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{reservationStatusLabels[r.status] ?? r.status}</span></td>
                    <td className="p-4 text-right">
                      <select value={r.status} disabled={r.status === 'cancelled'} onChange={e => handleChangeStatus(r.reservationId, e.target.value)} className="px-3 py-2 border rounded-lg outline-none bg-white text-sm disabled:bg-slate-100 disabled:text-slate-400">
                        {Object.entries(reservationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td className="p-4 text-right"><button onClick={() => setSelectedReservationId(r.reservationId)} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm">Szczegóły</button></td>
                  </tr>
                ))}
                {filteredReservations.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-slate-500">Brak rezerwacji spełniających kryteria.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* --- ZAKŁADKA 6: UDOGODNIENIA --- */}
      {activeTab === 'amenities' && (
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
      )}

      {/* --- ZAKŁADKA 7: BLOKADY POKOI --- */}
      {activeTab === 'blocks' && (
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
                {blocks.filter(b => blockRoomFilter === 0 || b.roomId === blockRoomFilter).map(b => (
                  <tr key={b.roomBlockId} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800">{b.roomNumber}</td>
                    <td className="p-4 text-slate-600">{new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-600">{b.reason}</td>
                    <td className="p-4 text-slate-600">{b.ownerName}</td>
                    <td className="p-4 text-right"><button onClick={() => handleDeleteBlock(b.roomBlockId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                  </tr>
                ))}
                {blocks.filter(b => blockRoomFilter === 0 || b.roomId === blockRoomFilter).length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500">Brak blokad.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ZAKŁADKA 8: OPINIE (MODERACJA) --- */}
      {activeTab === 'reviews' && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm border-b">
                <th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Gość</th>
                <th className="p-4 font-semibold">Pobyt</th><th className="p-4 font-semibold">Ocena</th>
                <th className="p-4 font-semibold">Komentarz</th><th className="p-4 font-semibold text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(rv => (
                <tr key={rv.reviewId} className="border-b hover:bg-slate-50">
                  <td className="p-4 text-slate-500">{new Date(rv.date!).toLocaleDateString()}</td>
                  <td className="p-4 font-medium text-slate-800">{rv.guestName}</td>
                  <td className="p-4 text-slate-600">#{rv.reservationId} ({rv.roomTypeName})</td>
                  <td className="p-4 text-amber-500 whitespace-nowrap">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</td>
                  <td className="p-4 text-slate-600">{rv.comment || '—'}</td>
                  <td className="p-4 text-right"><button onClick={() => handleDeleteReview(rv.reviewId!)} className="text-red-500 hover:text-red-700 font-medium text-sm">Usuń</button></td>
                </tr>
              ))}
              {reviews.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">Brak opinii.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {selectedReservationId && (
        <ReservationDetails token={token} reservationId={selectedReservationId} isOwner={true} onClose={() => setSelectedReservationId(null)} onChanged={loadData} />
      )}
    </div>
  );
}