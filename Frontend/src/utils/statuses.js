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

// Statusy rezerwacji (pending / confirmed / cancelled / completed)
export const reservationStatusLabels = {
  'pending': 'Oczekująca',
  'confirmed': 'Potwierdzona',
  'cancelled': 'Anulowana',
  'completed': 'Zrealizowana'
};

export const reservationStatusStyles = {
  'pending': 'bg-amber-100 text-amber-700',
  'confirmed': 'bg-emerald-100 text-emerald-700',
  'cancelled': 'bg-red-100 text-red-700',
  'completed': 'bg-sky-100 text-sky-700'
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

// Sposób naliczania usług dodatkowych (per-stay / per-night / per-person / per-person-per-night)
export const serviceChargeTypeLabels = {
  'per-stay': 'raz za pobyt',
  'per-night': 'za noc',
  'per-person': 'za osobę',
  'per-person-per-night': 'za osobę za noc'
};

// Ile razy usługa jest doliczana do pobytu - ta sama reguła co ServiceChargeType.Quantity w API
export const serviceQuantity = (chargeType, nights, guests) => {
  switch (chargeType) {
    case 'per-night': return nights;
    case 'per-person': return guests;
    case 'per-person-per-night': return nights * guests;
    default: return 1;
  }
};
