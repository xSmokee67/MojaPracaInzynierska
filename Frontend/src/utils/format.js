// Plik: Frontend/src/utils/format.js

// Polska odmiana liczebników: 1 osoba, 2-4 osoby (oprócz 12-14), pozostałe - osób
const plural = (n, one, few, many) =>
  n === 1 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many;

export const personsLabel = (n) => `${n} ${plural(n, 'osoba', 'osoby', 'osób')}`;
export const roomsLabel = (n) => `${n} ${plural(n, 'pokój', 'pokoje', 'pokoi')}`;
export const reviewsLabel = (n) => `${n} ${plural(n, 'opinia', 'opinie', 'opinii')}`;
export const nightsLabel = (n) => `${n} ${plural(n, 'noc', 'noce', 'nocy')}`;
// Sama data "yyyy-MM-dd" jest parsowana jako UTC - dopisujemy godzinę, żeby nie przesuwała się o strefę czasową
export const formatDate = (value) => new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('pl-PL');

// Data w formacie yyyy-MM-dd w czasie lokalnym (toISOString przesuwa datę o strefę czasową)
export const toInputDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const addDaysToInputDate = (value, days) => { const d = new Date(`${value}T00:00:00`); d.setDate(d.getDate() + days); return toInputDate(d); };
// Data z godziną (np. data płatności) - zawsze w polskim formacie, niezależnie od języka przeglądarki
export const formatDateTime = (value) => new Date(value).toLocaleString('pl-PL');

// Rezerwacje przeniesione przez API do innych pokoi (remont, wyłączenie pokoju, blokada) - do komunikatu po zapisie
export const relocationsLabel = (relocated) => relocated && relocated.length > 0
  ? ` Przeniesiono rezerwacje: ${relocated.map(r => `#${r.reservationId} (${formatDate(r.checkInDate)} - ${formatDate(r.checkOutDate)}) z pokoju ${r.fromRoomNumber} do ${r.toRoomNumber}`).join(', ')}.`
  : '';