import type { CreateReservationDto, AvailabilityResponse, PriceResponse, ReservationDto, UpdateReservationStatusDto, ReservationDetailsDto, PaymentDto, ReviewDto } from "../types/reservation";

const API_URL = 'http://localhost:5285/api/Reservation';

export const checkAvailability = async (roomTypeId: number, checkIn: string, checkOut: string): Promise<AvailabilityResponse> => {
  const response = await fetch(`${API_URL}/availability?roomTypeId=${roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}`);
  if (!response.ok) throw new Error('Błąd sprawdzania dostępności');
  return response.json();
};

export const calculatePrice = async (dto: CreateReservationDto): Promise<PriceResponse> => {
  const response = await fetch(`${API_URL}/price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!response.ok) throw new Error('Błąd kalkulacji ceny');
  return response.json();
};

export const createReservation = async (dto: CreateReservationDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/create`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Wstrzyknięcie tokenu JWT
    },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Nie udało się utworzyć rezerwacji');
  }
};

export const getMyReservations = async (token: string): Promise<ReservationDto[]> => {
  const response = await fetch(`${API_URL}/my`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Błąd pobierania Twoich rezerwacji');
  return response.json();
};

export const getAllReservations = async (token: string): Promise<ReservationDto[]> => {
  const response = await fetch(`${API_URL}/all`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Błąd pobierania rezerwacji');
  return response.json();
};

export const updateReservationStatus = async (id: number, dto: UpdateReservationStatusDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd zmiany statusu rezerwacji');
  }
};

export const getReservationDetails = async (id: number, token: string): Promise<ReservationDetailsDto> => {
  const response = await fetch(`${API_URL}/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Błąd pobierania szczegółów rezerwacji');
  return response.json();
};

export const cancelReservation = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}/cancel`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Nie udało się anulować rezerwacji');
  }
};

export const registerPayment = async (id: number, dto: PaymentDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd rejestracji płatności');
  }
};

export const issueInvoice = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}/invoice`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd wystawiania faktury');
  }
};

// --- OPINIE ---
export const createReview = async (dto: ReviewDto, token: string): Promise<void> => {
  const response = await fetch('http://localhost:5285/api/Review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd dodawania opinii');
  }
};