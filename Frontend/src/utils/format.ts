// Plik: Frontend/src/utils/format.ts

// Polska odmiana liczebników: 1 osoba, 2-4 osoby (oprócz 12-14), pozostałe - osób
const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many;

export const personsLabel = (n: number) => `${n} ${plural(n, 'osoba', 'osoby', 'osób')}`;
export const roomsLabel = (n: number) => `${n} ${plural(n, 'pokój', 'pokoje', 'pokoi')}`;
export const reviewsLabel = (n: number) => `${n} ${plural(n, 'opinia', 'opinie', 'opinii')}`;