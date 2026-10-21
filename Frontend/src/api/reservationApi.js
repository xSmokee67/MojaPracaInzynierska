import { apiRequest } from './apiClient';

export const checkAvailability = (roomTypeId, checkIn, checkOut) =>
  apiRequest(`/Reservation/availability?roomTypeId=${roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}`, {}, 'Błąd sprawdzania dostępności');

export const calculatePrice = (dto) =>
  apiRequest('/Reservation/price', { method: 'POST', body: dto }, 'Błąd kalkulacji ceny');

export const createReservation = (dto, token) =>
  apiRequest('/Reservation/create', { method: 'POST', token, body: dto }, 'Nie udało się utworzyć rezerwacji');

export const getMyReservations = (token) =>
  apiRequest('/Reservation/my', { token }, 'Błąd pobierania Twoich rezerwacji');

export const getAllReservations = (token) =>
  apiRequest('/Reservation/all', { token }, 'Błąd pobierania rezerwacji');

export const updateReservationStatus = (id, dto, token) =>
  apiRequest(`/Reservation/${id}/status`, { method: 'PUT', token, body: dto }, 'Błąd zmiany statusu rezerwacji');

export const getReservationDetails = (id, token) =>
  apiRequest(`/Reservation/${id}`, { token }, 'Błąd pobierania szczegółów rezerwacji');

export const cancelReservation = (id, token) =>
  apiRequest(`/Reservation/${id}/cancel`, { method: 'PUT', token }, 'Nie udało się anulować rezerwacji');

export const registerPayment = (id, dto, token) =>
  apiRequest(`/Reservation/${id}/payments`, { method: 'POST', token, body: dto }, 'Błąd rejestracji płatności');

export const issueInvoice = (id, token) =>
  apiRequest(`/Reservation/${id}/invoice`, { method: 'POST', token }, 'Błąd wystawiania faktury');

// --- OPINIE ---
export const createReview = (dto, token) =>
  apiRequest('/Review', { method: 'POST', token, body: dto }, 'Błąd dodawania opinii');

// Opinie zalogowanego gościa (strona "Mój profil")
export const getMyReviews = (token) =>
  apiRequest('/Review/my', { token }, 'Błąd pobierania Twoich opinii');