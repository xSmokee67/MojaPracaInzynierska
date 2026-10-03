import type { RoomTypeDetailsDto, RoomTypeAvailabilityDto, SearchCriteria } from '../types/room';
import { throwApiError } from './apiErrors';
import { SERVER_URL, API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/RoomType`;

// API zwraca adresy zdjęć względne (/uploads/...) - obrazki są serwowane przez serwer API
export const photoUrl = (url: string) => `${SERVER_URL}${url}`;

// Publiczny profil typu pokoju (bez logowania)
export const getRoomTypeDetails = async (id: number): Promise<RoomTypeDetailsDto> => {
  const response = await fetch(`${API_URL}/${id}`);
  if (!response.ok) await throwApiError(response, 'Nie znaleziono pokoju');
  return response.json();
};

// Wyszukiwarka na stronie głównej: dostępność i cena pobytu dla wszystkich typów pokoi
export const searchRoomTypes = async (criteria: SearchCriteria): Promise<RoomTypeAvailabilityDto[]> => {
  const response = await fetch(`${SERVER_URL}/api/Reservation/search?checkIn=${criteria.checkIn}&checkOut=${criteria.checkOut}&guests=${criteria.guests}`);
  if (!response.ok) await throwApiError(response, 'Błąd wyszukiwania pokoi');
  return response.json();
};