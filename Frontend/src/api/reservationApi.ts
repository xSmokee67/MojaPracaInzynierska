import type { CreateReservationDto, AvailabilityResponse, PriceResponse } from "../types/reservation";

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