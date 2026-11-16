// Plik: Frontend/src/utils/statuses.js

// Statusy zapisywane w bazie jako tekst (słownik danych) - polskie nazwy i kolory etykiet w interfejsie

// Statusy pokoju (available / maintenance / disabled)
export const roomStatusLabels = {
  'available': 'Dostępny',
  'maintenance': 'W remoncie',
  'disabled': 'Wyłączony'
};

export const roomStatusStyles = {
  'available': 'bg-success-50 text-success-700',
  'maintenance': 'bg-warning-50 text-warning-700',
  'disabled': 'bg-slate-100 text-slate-500'
};

// Statusy rezerwacji (pending / confirmed / cancelled / completed)
export const reservationStatusLabels = {
  'pending': 'Oczekująca',
  'confirmed': 'Potwierdzona',
  'cancelled': 'Anulowana',
  'completed': 'Zrealizowana'
};

export const reservationStatusStyles = {
  'pending': 'bg-warning-50 text-warning-700',
  'confirmed': 'bg-info-50 text-navy-900',
  'cancelled': 'bg-slate-100 text-slate-500',
  'completed': 'bg-success-50 text-success-700'
};

// Metody i rodzaje płatności
export const paymentMethodLabels = {
  'card': 'Karta',
  'transfer': 'Przelew',
  'cash': 'Gotówka',
  'BLIK': 'BLIK'
};

// Rodzaj wpisu płatności: pieniądze otrzymane od gościa albo mu oddane
export const paymentStatusLabels = {
  'completed': 'Wpłata',
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
