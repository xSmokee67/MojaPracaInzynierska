import type { CreateReservationDto, AvailabilityResponse, PriceResponse, ReservationDto, UpdateReservationStatusDto, ReservationDetailsDto, PaymentDto, ReviewDto } from "../types/reservation";
import { apiRequest } from './apiClient';

export const checkAvailability = (roomTypeId: number, checkIn: string, checkOut: string): Promise<AvailabilityResponse> =>
  apiRequest(`/Reservation/availability?roomTypeId=${roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}`, {}, 'Błąd sprawdzania dostępności');

export const calculatePrice = (dto: CreateReservationDto): Promise<PriceResponse> =>
  apiRequest('/Reservation/price', { method: 'POST', body: dto }, 'Błąd kalkulacji ceny');

export const createReservation = (dto: CreateReservationDto, token: string): Promise<void> =>
  apiRequest('/Reservation/create', { method: 'POST', token, body: dto }, 'Nie udało się utworzyć rezerwacji');

export const getMyReservations = (token: string): Promise<ReservationDto[]> =>
  apiRequest('/Reservation/my', { token }, 'Błąd pobierania Twoich rezerwacji');

export const getAllReservations = (token: string): Promise<ReservationDto[]> =>
  apiRequest('/Reservation/all', { token }, 'Błąd pobierania rezerwacji');

export const updateReservationStatus = (id: number, dto: UpdateReservationStatusDto, token: string): Promise<void> =>
  apiRequest(`/Reservation/${id}/status`, { method: 'PUT', token, body: dto }, 'Błąd zmiany statusu rezerwacji');

export const getReservationDetails = (id: number, token: string): Promise<ReservationDetailsDto> =>
  apiRequest(`/Reservation/${id}`, { token }, 'Błąd pobierania szczegółów rezerwacji');

export const cancelReservation = (id: number, token: string): Promise<void> =>
  apiRequest(`/Reservation/${id}/cancel`, { method: 'PUT', token }, 'Nie udało się anulować rezerwacji');

export const registerPayment = (id: number, dto: PaymentDto, token: string): Promise<void> =>
  apiRequest(`/Reservation/${id}/payments`, { method: 'POST', token, body: dto }, 'Błąd rejestracji płatności');

export const issueInvoice = (id: number, token: string): Promise<void> =>
  apiRequest(`/Reservation/${id}/invoice`, { method: 'POST', token }, 'Błąd wystawiania faktury');

// --- OPINIE ---
export const createReview = (dto: ReviewDto, token: string): Promise<void> =>
  apiRequest('/Review', { method: 'POST', token, body: dto }, 'Błąd dodawania opinii');

// Opinie zalogowanego gościa (strona "Mój profil")
export const getMyReviews = (token: string): Promise<ReviewDto[]> =>
  apiRequest('/Review/my', { token }, 'Błąd pobierania Twoich opinii');