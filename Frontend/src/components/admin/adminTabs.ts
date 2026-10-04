// Plik: Frontend/src/components/admin/adminTabs.ts

// Zakładki Panelu Właściciela - każda pod własnym adresem (#/panel/pokoje, #/panel/rezerwacje/12)
export type AdminTab = 'roomTypes' | 'rooms' | 'amenities' | 'pricing' | 'services' | 'blocks' | 'reservations' | 'reviews';

// Kolejność i nazwy zakładek (przyciski, okruszki, adresy)
export const adminTabs: { id: AdminTab; slug: string; label: string; breadcrumb: string }[] = [
  { id: 'roomTypes', slug: 'typy-pokoi', label: 'Typy Pokoi', breadcrumb: 'Typy pokoi' },
  { id: 'rooms', slug: 'pokoje', label: 'Fizyczne Pokoje', breadcrumb: 'Fizyczne pokoje' },
  { id: 'amenities', slug: 'udogodnienia', label: 'Udogodnienia', breadcrumb: 'Udogodnienia' },
  { id: 'pricing', slug: 'cennik', label: 'Cennik Sezonowy', breadcrumb: 'Cennik sezonowy' },
  { id: 'services', slug: 'uslugi', label: 'Usługi Dodatkowe', breadcrumb: 'Usługi dodatkowe' },
  { id: 'blocks', slug: 'blokady', label: 'Blokady', breadcrumb: 'Blokady pokoi' },
  { id: 'reservations', slug: 'rezerwacje', label: 'Rezerwacje', breadcrumb: 'Rezerwacje' },
  { id: 'reviews', slug: 'opinie', label: 'Opinie', breadcrumb: 'Opinie' }
];

// Sam adres #/panel (albo nieznana zakładka) otwiera pierwszą zakładkę
export const adminTabBySlug = (slug?: string): AdminTab => adminTabs.find(t => t.slug === slug)?.id ?? 'roomTypes';

export const adminTabPath = (tab: AdminTab) => `/panel/${adminTabs.find(t => t.id === tab)!.slug}`;