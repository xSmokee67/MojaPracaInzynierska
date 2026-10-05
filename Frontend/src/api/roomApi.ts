import type { RoomTypeDetailsDto, RoomTypeAvailabilityDto, SearchCriteria } from '../types/room';
import { apiRequest } from './apiClient';
import { SERVER_URL } from './config';

// API zwraca adresy zdjęć względne (/uploads/...) - obrazki są serwowane przez serwer API
export const photoUrl = (url: string) => `${SERVER_URL}${url}`;

// Publiczny profil typu pokoju (bez logowania)
export const getRoomTypeDetails = (id: number): Promise<RoomTypeDetailsDto> =>
  apiRequest(`/RoomType/${id}`, {}, 'Nie znaleziono pokoju');

// Wyszukiwarka na stronie głównej: dostępność i cena pobytu dla wszystkich typów pokoi
export const searchRoomTypes = (criteria: SearchCriteria): Promise<RoomTypeAvailabilityDto[]> =>
  apiRequest(`/Reservation/search?checkIn=${criteria.checkIn}&checkOut=${criteria.checkOut}&guests=${criteria.guests}`, {}, 'Błąd wyszukiwania pokoi');