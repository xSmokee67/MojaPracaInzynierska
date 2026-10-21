// Plik: Frontend/src/api/adminApi.js
import { apiRequest } from './apiClient';

// --- TYPY POKOI ---
export const getRoomTypes = () =>
  apiRequest('/RoomType', {}, 'Błąd pobierania typów pokoi');

export const createRoomType = (dto, token) =>
  apiRequest('/RoomType', { method: 'POST', token, body: dto }, 'Błąd tworzenia typu pokoju');

export const updateRoomType = (id, dto, token) =>
  apiRequest(`/RoomType/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji typu pokoju');

export const deleteRoomType = (id, token) =>
  apiRequest(`/RoomType/${id}`, { method: 'DELETE', token }, 'Błąd usuwania typu pokoju');

// --- POKOJE FIZYCZNE ---
export const getRooms = (token) =>
  apiRequest('/Room', { token }, 'Błąd pobierania pokoi');

export const createRoom = (dto, token) =>
  apiRequest('/Room', { method: 'POST', token, body: dto }, 'Błąd tworzenia pokoju');

export const updateRoom = (id, dto, token) =>
  apiRequest(`/Room/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji pokoju');

export const deleteRoom = (id, token) =>
  apiRequest(`/Room/${id}`, { method: 'DELETE', token }, 'Błąd usuwania pokoju');

// --- USŁUGI DODATKOWE ---
export const getAdditionalServices = () =>
  apiRequest('/AdditionalService', {}, 'Błąd pobierania usług');

export const createAdditionalService = (dto, token) =>
  apiRequest('/AdditionalService', { method: 'POST', token, body: dto }, 'Błąd dodawania usługi');

export const updateAdditionalService = (id, dto, token) =>
  apiRequest(`/AdditionalService/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji usługi');

export const deleteAdditionalService = (id, token) =>
  apiRequest(`/AdditionalService/${id}`, { method: 'DELETE', token }, 'Błąd usuwania usługi');

// --- CENNIK SEZONOWY ---
export const getPriceListEntries = (token) =>
  apiRequest('/PriceListEntry', { token }, 'Błąd pobierania cennika');

export const createPriceListEntry = (dto, token) =>
  apiRequest('/PriceListEntry', { method: 'POST', token, body: dto }, 'Błąd dodawania wpisu w cenniku');

export const updatePriceListEntry = (id, dto, token) =>
  apiRequest(`/PriceListEntry/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji wpisu w cenniku');

export const deletePriceListEntry = (id, token) =>
  apiRequest(`/PriceListEntry/${id}`, { method: 'DELETE', token }, 'Błąd usuwania wpisu z cennika');

// --- UDOGODNIENIA ---
export const getAmenities = () =>
  apiRequest('/Amenity', {}, 'Błąd pobierania udogodnień');

export const createAmenity = (dto, token) =>
  apiRequest('/Amenity', { method: 'POST', token, body: dto }, 'Błąd dodawania udogodnienia');

export const updateAmenity = (id, dto, token) =>
  apiRequest(`/Amenity/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji udogodnienia');

export const deleteAmenity = (id, token) =>
  apiRequest(`/Amenity/${id}`, { method: 'DELETE', token }, 'Błąd usuwania udogodnienia');

// --- BLOKADY POKOI ---
export const getRoomBlocks = (token) =>
  apiRequest('/RoomBlock', { token }, 'Błąd pobierania blokad');

export const createRoomBlock = (dto, token) =>
  apiRequest('/RoomBlock', { method: 'POST', token, body: dto }, 'Błąd tworzenia blokady');

export const deleteRoomBlock = (id, token) =>
  apiRequest(`/RoomBlock/${id}`, { method: 'DELETE', token }, 'Błąd usuwania blokady');

// --- KALENDARZ DOSTĘPNOŚCI ---
// Noce z zakresu [from, to) dla wszystkich pokoi (daty w formacie YYYY-MM-DD)
export const getAvailabilityCalendar = (from, to, token) =>
  apiRequest(`/Availability/calendar?from=${from}&to=${to}`, { token }, 'Błąd pobierania kalendarza dostępności');

// --- OPINIE (MODERACJA) ---
export const getReviews = () =>
  apiRequest('/Review', {}, 'Błąd pobierania opinii');

export const deleteReview = (id, token) =>
  apiRequest(`/Review/${id}`, { method: 'DELETE', token }, 'Błąd usuwania opinii');

// --- ZDJĘCIA TYPÓW POKOI ---
export const uploadRoomTypePhotos = (roomTypeId, files, token) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  return apiRequest(`/RoomType/${roomTypeId}/photos`, { method: 'POST', token, body: formData }, 'Błąd dodawania zdjęć');
};

export const deleteRoomTypePhoto = (photoId, token) =>
  apiRequest(`/RoomType/photos/${photoId}`, { method: 'DELETE', token }, 'Błąd usuwania zdjęcia');

export const setMainRoomTypePhoto = (photoId, token) =>
  apiRequest(`/RoomType/photos/${photoId}/main`, { method: 'PUT', token }, 'Błąd ustawiania zdjęcia głównego');