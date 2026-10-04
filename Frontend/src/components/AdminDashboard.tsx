// Plik: Frontend/src/components/AdminDashboard.tsx
import { useState } from 'react';
import RoomTypesTab from './admin/RoomTypesTab';
import RoomsTab from './admin/RoomsTab';
import AmenitiesTab from './admin/AmenitiesTab';
import PricingTab from './admin/PricingTab';
import ServicesTab from './admin/ServicesTab';
import BlocksTab from './admin/BlocksTab';
import ReservationsTab from './admin/ReservationsTab';
import ReviewsTab from './admin/ReviewsTab';

type AdminTab = 'roomTypes' | 'rooms' | 'amenities' | 'pricing' | 'services' | 'blocks' | 'reservations' | 'reviews';

// Kolejność i nazwy zakładek (przyciski i okruszki)
const tabs: { id: AdminTab; label: string; breadcrumb: string }[] = [
  { id: 'roomTypes', label: 'Typy Pokoi', breadcrumb: 'Typy pokoi' },
  { id: 'rooms', label: 'Fizyczne Pokoje', breadcrumb: 'Fizyczne pokoje' },
  { id: 'amenities', label: 'Udogodnienia', breadcrumb: 'Udogodnienia' },
  { id: 'pricing', label: 'Cennik Sezonowy', breadcrumb: 'Cennik sezonowy' },
  { id: 'services', label: 'Usługi Dodatkowe', breadcrumb: 'Usługi dodatkowe' },
  { id: 'blocks', label: 'Blokady', breadcrumb: 'Blokady pokoi' },
  { id: 'reservations', label: 'Rezerwacje', breadcrumb: 'Rezerwacje' },
  { id: 'reviews', label: 'Opinie', breadcrumb: 'Opinie' }
];

// Panel Właściciela: nawigacja między zakładkami - każda zakładka sama ładuje swoje dane i pokazuje komunikaty
export default function AdminDashboard({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('roomTypes');

  // Otwarte szczegóły rezerwacji (pokazywane też w okruszkach)
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);

  const activeTabInfo = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="w-full max-w-6xl p-4 md:p-6 bg-white rounded-xl shadow-lg space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <h2 className="text-3xl font-bold text-slate-800">Panel Właściciela</h2>
        <div className="flex flex-wrap md:justify-end gap-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab.label}</button>
          ))}
        </div>
      </div>

      <nav className="text-sm text-slate-500">
        <span>Panel Właściciela</span>
        <span className="mx-2">›</span>
        <span className="font-semibold text-slate-800">{activeTabInfo.breadcrumb}</span>
        {selectedReservationId && activeTab === 'reservations' && (<><span className="mx-2">›</span><span className="font-semibold text-slate-800">Rezerwacja #{selectedReservationId}</span></>)}
      </nav>

      {/* Zmiana zakładki odmontowuje poprzednią, więc jej komunikaty i formularz są czyszczone */}
      {activeTab === 'roomTypes' && <RoomTypesTab token={token} />}
      {activeTab === 'rooms' && <RoomsTab token={token} />}
      {activeTab === 'amenities' && <AmenitiesTab token={token} />}
      {activeTab === 'pricing' && <PricingTab token={token} />}
      {activeTab === 'services' && <ServicesTab token={token} />}
      {activeTab === 'blocks' && <BlocksTab token={token} />}
      {activeTab === 'reservations' && <ReservationsTab token={token} selectedReservationId={selectedReservationId} onSelectReservation={setSelectedReservationId} />}
      {activeTab === 'reviews' && <ReviewsTab token={token} />}
    </div>
  );
}