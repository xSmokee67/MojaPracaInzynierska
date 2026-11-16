// Plik: Frontend/src/components/admin/AdminDashboard.jsx
import { adminTabs, adminTabGroups, adminTabPath } from './adminTabs';
import AvailabilityTab from './AvailabilityTab';
import RoomTypesTab from './RoomTypesTab';
import RoomsTab from './RoomsTab';
import AmenitiesTab from './AmenitiesTab';
import PricingTab from './PricingTab';
import ServicesTab from './ServicesTab';
import BlocksTab from './BlocksTab';
import ReservationsTab from './ReservationsTab';
import ReviewsTab from './ReviewsTab';

// Panel Właściciela: menu boczne z grupami zakładek i treść zakładki obok.
// Zakładka i otwarte szczegóły rezerwacji wynikają z adresu (#/panel/rezerwacje/12),
// więc działa przycisk "Wstecz", odświeżenie strony i link do konkretnej zakładki
export default function AdminDashboard({ token, tab, reservationId, onNavigate }) {
  const activeTabInfo = adminTabs.find(t => t.id === tab);

  return (
    <div className="w-full max-w-page flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
      {/* --- MENU PANELU: na dużym ekranie kolumna z grupami, na telefonie przewijany rząd --- */}
      <nav aria-label="Panel właściciela" className="w-full lg:w-56 shrink-0 flex lg:flex-col gap-1 lg:gap-5 overflow-x-auto pb-2 lg:pb-0 lg:sticky lg:top-6">
        {adminTabGroups.map(group => (
          <div key={group} className="flex lg:flex-col gap-1 shrink-0">
            <span className="hidden lg:block eyebrow px-3 pb-1.5">{group}</span>
            {adminTabs.filter(t => t.group === group).map(t => (
              <button key={t.id} onClick={() => onNavigate(adminTabPath(t.id))} aria-current={tab === t.id ? 'page' : undefined}
                className={`whitespace-nowrap text-left px-3 py-2.5 rounded-[10px] text-[15px] transition-colors ${tab === t.id ? 'bg-navy-900 text-white font-semibold' : 'text-navy-900 hover:bg-sand-100'}`}>
                {t.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="flex-1 min-w-0 w-full space-y-6">
        <div>
          <nav className="text-sm text-slate-500">
            <span>Panel właściciela</span>
            <span className="mx-2">›</span>
            <span>{activeTabInfo.label}</span>
            {reservationId && tab === 'reservations' && (<><span className="mx-2">›</span><span className="font-semibold text-navy-900">Rezerwacja #{reservationId}</span></>)}
          </nav>
          <h1 className="mt-2 text-3xl md:text-[2.375rem] font-medium">{activeTabInfo.title}</h1>
          <p className="mt-1.5 text-[15px] text-slate-500">{activeTabInfo.description}</p>
        </div>

        {/* Zmiana zakładki odmontowuje poprzednią, więc jej komunikaty i formularz są czyszczone */}
        {tab === 'availability' && <AvailabilityTab token={token} onNavigate={onNavigate} />}
        {tab === 'roomTypes' && <RoomTypesTab token={token} />}
        {tab === 'rooms' && <RoomsTab token={token} />}
        {tab === 'amenities' && <AmenitiesTab token={token} />}
        {tab === 'pricing' && <PricingTab token={token} />}
        {tab === 'services' && <ServicesTab token={token} />}
        {tab === 'blocks' && <BlocksTab token={token} />}
        {tab === 'reservations' && <ReservationsTab token={token} selectedReservationId={reservationId ?? null} onSelectReservation={id => onNavigate(id ? `/panel/rezerwacje/${id}` : '/panel/rezerwacje')} />}
        {tab === 'reviews' && <ReviewsTab token={token} />}
      </div>
    </div>
  );
}
