// Plik: Frontend/src/utils/statuses.js

// Statusy zapisywane w bazie jako tekst (słownik danych) - polskie nazwy i kolory etykiet w interfejsie

// Statusy pokoju (available / cleaning / maintenance / disabled)
export const roomStatusLabels = {
  'available': 'Dostępny',
  'cleaning': 'Sprzątanie',
  'maintenance': 'W remoncie',
  'disabled': 'Wyłączony'
};

export const roomStatusStyles = {
  'available': 'bg-emerald-100 text-emerald-700',
  'cleaning': 'bg-sky-100 text-sky-700',
  'maintenance': 'bg-amber-100 text-amber-700',
  'disabled': 'bg-slate-200 text-slate-600'
};

// Statusy rezerwacji (pending / confirmed / cancelled / completed / no-show)
export const reservationStatusLabels = {
  'pending': 'Oczekująca',
  'confirmed': 'Potwierdzona',
  'cancelled': 'Anulowana',
  'completed': 'Zrealizowana',
  'no-show': 'Niestawienie się'
};

export const reservationStatusStyles = {
  'pending': 'bg-amber-100 text-amber-700',
  'confirmed': 'bg-emerald-100 text-emerald-700',
  'cancelled': 'bg-red-100 text-red-700',
  'completed': 'bg-sky-100 text-sky-700',
  'no-show': 'bg-slate-200 text-slate-700'
};

// Metody i statusy płatności
export const paymentMethodLabels = {
  'card': 'Karta',
  'transfer': 'Przelew',
  'cash': 'Gotówka',
  'BLIK': 'BLIK'
};

export const paymentStatusLabels = {
  'pending': 'Oczekująca',
  'completed': 'Zaksięgowana',
  'failed': 'Nieudana',
  'refunded': 'Zwrot'
};