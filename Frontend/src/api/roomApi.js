import { apiRequest } from './apiClient';
import { SERVER_URL } from './config';

// API zwraca adresy zdjęć względne (/uploads/...) - obrazki są serwowane przez serwer API
export const photoUrl = (url) => `${SERVER_URL}${url}`;

// Publiczny profil typu pokoju (bez logowania)
export const getRoomTypeDetails = (id) =>
  apiRequest(`/RoomType/${id}`, {}, 'Nie znaleziono pokoju');

// Kalendarz dostępności typu pokoju (bez logowania): wolne pokoje w każdej nocy z zakresu [from, to)
export const getRoomTypeAvailability = (id, from, to) =>
  apiRequest(`/Availability/room-type/${id}?from=${from}&to=${to}`, {}, 'Błąd pobierania kalendarza dostępności');

// Wyszukiwarka na stronie głównej: dostępność i cena pobytu dla wszystkich typów pokoi
export const searchRoomTypes = (criteria) =>
  apiRequest(`/Reservation/search?checkIn=${criteria.checkIn}&checkOut=${criteria.checkOut}&guests=${criteria.guests}`, {}, 'Błąd wyszukiwania pokoi');