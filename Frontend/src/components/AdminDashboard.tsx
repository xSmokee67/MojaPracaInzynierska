// Plik: Frontend/src/components/AdminDashboard.tsx
import type { AdminTab } from './admin/adminTabs';
import { adminTabs, adminTabPath } from './admin/adminTabs';
import RoomTypesTab from './admin/RoomTypesTab';
import RoomsTab from './admin/RoomsTab';
import AmenitiesTab from './admin/AmenitiesTab';
import PricingTab from './admin/PricingTab';
import ServicesTab from './admin/ServicesTab';
import BlocksTab from './admin/BlocksTab';
import ReservationsTab from './admin/ReservationsTab';
import ReviewsTab from './admin/ReviewsTab';

// Panel Właściciela: zakładka i otwarte szczegóły rezerwacji wynikają z adresu (#/panel/rezerwacje/12),
// więc działa przycisk "Wstecz", odświeżenie strony i link do konkretnej zakładki
export default function AdminDashboard({ token, tab, reservationId, onNavigate }: { token: string; tab: AdminTab; reservationId?: number; onNavigate: (path: string) => void }) {
  const activeTabInfo = adminTabs.find(t => t.id === tab)!;

  return (
    <div className="w-full max-w-6xl p-4 md:p-6 bg-white rounded-xl shadow-lg space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <h2 className="text-3xl font-bold text-slate-800">Panel Właściciela</h2>
        <div className="flex flex-wrap md:justify-end gap-2">
          {adminTabs.map(t => (
            <button key={t.id} onClick={() => onNavigate(adminTabPath(t.id))} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <nav className="text-sm text-slate-500">
        <span>Panel Właściciela</span>
        <span className="mx-2">›</span>
        <span className="font-semibold text-slate-800">{activeTabInfo.breadcrumb}</span>
        {reservationId && tab === 'reservations' && (<><span className="mx-2">›</span><span className="font-semibold text-slate-800">Rezerwacja #{reservationId}</span></>)}
      </nav>

      {/* Zmiana zakładki odmontowuje poprzednią, więc jej komunikaty i formularz są czyszczone */}
      {tab === 'roomTypes' && <RoomTypesTab token={token} />}
      {tab === 'rooms' && <RoomsTab token={token} />}
      {tab === 'amenities' && <AmenitiesTab token={token} />}
      {tab === 'pricing' && <PricingTab token={token} />}
      {tab === 'services' && <ServicesTab token={token} />}
      {tab === 'blocks' && <BlocksTab token={token} />}
      {tab === 'reservations' && <ReservationsTab token={token} selectedReservationId={reservationId ?? null} onSelectReservation={id => onNavigate(id ? `/panel/rezerwacje/${id}` : '/panel/rezerwacje')} />}
      {tab === 'reviews' && <ReviewsTab token={token} />}
    </div>
  );
}