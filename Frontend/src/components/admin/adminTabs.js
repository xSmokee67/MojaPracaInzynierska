// Plik: Frontend/src/components/admin/adminTabs.js

// Zakładki Panelu Właściciela - każda pod własnym adresem (#/panel/pokoje, #/panel/rezerwacje/12)
// Kolejność, grupy w menu bocznym, nazwy (menu, nagłówek strony) i krótki opis pod nagłówkiem
export const adminTabs = [
  { id: 'availability', slug: 'dostepnosc', group: 'Przegląd', label: 'Dostępność', title: 'Kalendarz dostępności', description: 'Pokoje × noce: wolne, zarezerwowane i zablokowane. Kliknij rezerwację, aby otworzyć szczegóły.' },
  { id: 'reservations', slug: 'rezerwacje', group: 'Przegląd', label: 'Rezerwacje', title: 'Rezerwacje', description: 'Wszystkie rezerwacje gości - w szczegółach płatności i faktura.' },
  { id: 'roomTypes', slug: 'typy-pokoi', group: 'Oferta', label: 'Typy pokoi', title: 'Typy pokoi', description: 'Oferta widoczna dla gości: nazwa, opis, cena bazowa, pojemność i zdjęcia.' },
  { id: 'rooms', slug: 'pokoje', group: 'Oferta', label: 'Pokoje', title: 'Pokoje', description: 'Fizyczne pokoje hotelu z numerem, typem, statusem i udogodnieniami.' },
  { id: 'amenities', slug: 'udogodnienia', group: 'Oferta', label: 'Udogodnienia', title: 'Udogodnienia', description: 'Słownik udogodnień przypisywanych do pokoi.' },
  { id: 'pricing', slug: 'cennik', group: 'Oferta', label: 'Cennik sezonowy', title: 'Cennik sezonowy', description: 'Ceny za noc w wybranych okresach - zastępują cenę bazową typu pokoju.' },
  { id: 'services', slug: 'uslugi', group: 'Oferta', label: 'Usługi dodatkowe', title: 'Usługi dodatkowe', description: 'Usługi do wyboru przy rezerwacji i sposób ich naliczania.' },
  { id: 'blocks', slug: 'blokady', group: 'Obsługa', label: 'Blokady pokoi', title: 'Blokady pokoi', description: 'Remonty i konserwacje - zablokowany pokój nie przyjmuje rezerwacji, a te w terminie blokady są przenoszone.' },
  { id: 'reviews', slug: 'opinie', group: 'Obsługa', label: 'Opinie', title: 'Opinie', description: 'Opinie gości po zakończonych pobytach.' }
];

// Grupy menu bocznego w kolejności wyświetlania
export const adminTabGroups = [...new Set(adminTabs.map(t => t.group))];

// Sam adres #/panel (albo nieznana zakładka) otwiera pierwszą zakładkę - kalendarz dostępności
export const adminTabBySlug = (slug) => adminTabs.find(t => t.slug === slug)?.id ?? 'availability';

export const adminTabPath = (tab) => `/panel/${adminTabs.find(t => t.id === tab).slug}`;
