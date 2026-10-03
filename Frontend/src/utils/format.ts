// Plik: Frontend/src/utils/format.ts

// Polska odmiana liczebników: 1 osoba, 2-4 osoby (oprócz 12-14), pozostałe - osób
const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many;

export const personsLabel = (n: number) => `${n} ${plural(n, 'osoba', 'osoby', 'osób')}`;
export const roomsLabel = (n: number) => `${n} ${plural(n, 'pokój', 'pokoje', 'pokoi')}`;
export const reviewsLabel = (n: number) => `${n} ${plural(n, 'opinia', 'opinie', 'opinii')}`;
export const nightsLabel = (n: number) => `${n} ${plural(n, 'noc', 'noce', 'nocy')}`;
// Sama data "yyyy-MM-dd" jest parsowana jako UTC - dopisujemy godzinę, żeby nie przesuwała się o strefę czasową
export const formatDate = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('pl-PL');

// Data w formacie yyyy-MM-dd w czasie lokalnym (toISOString przesuwa datę o strefę czasową)
export const toInputDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const addDaysToInputDate = (value: string, days: number) => { const d = new Date(`${value}T00:00:00`); d.setDate(d.getDate() + days); return toInputDate(d); };