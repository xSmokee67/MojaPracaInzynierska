// Plik: Frontend/src/api/adminApi.ts
import type { RoomTypeDto, RoomDto, AdditionalServiceDto, PriceListEntryDto, AmenityDto, RoomBlockDto } from '../types/admin';
import type { ReviewDto } from '../types/reservation';
import { apiRequest } from './apiClient';

// --- TYPY POKOI ---
export const getRoomTypes = (): Promise<RoomTypeDto[]> =>
  apiRequest('/RoomType', {}, 'Błąd pobierania typów pokoi');

export const createRoomType = (dto: RoomTypeDto, token: string): Promise<void> =>
  apiRequest('/RoomType', { method: 'POST', token, body: dto }, 'Błąd tworzenia typu pokoju');

export const updateRoomType = (id: number, dto: RoomTypeDto, token: string): Promise<void> =>
  apiRequest(`/RoomType/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji typu pokoju');

export const deleteRoomType = (id: number, token: string): Promise<void> =>
  apiRequest(`/RoomType/${id}`, { method: 'DELETE', token }, 'Błąd usuwania typu pokoju');

// --- POKOJE FIZYCZNE ---
export const getRooms = (token: string): Promise<RoomDto[]> =>
  apiRequest('/Room', { token }, 'Błąd pobierania pokoi');

export const createRoom = (dto: RoomDto, token: string): Promise<void> =>
  apiRequest('/Room', { method: 'POST', token, body: dto }, 'Błąd tworzenia pokoju');

export const updateRoom = (id: number, dto: RoomDto, token: string): Promise<void> =>
  apiRequest(`/Room/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji pokoju');

export const deleteRoom = (id: number, token: string): Promise<void> =>
  apiRequest(`/Room/${id}`, { method: 'DELETE', token }, 'Błąd usuwania pokoju');

// --- USŁUGI DODATKOWE ---
export const getAdditionalServices = (): Promise<AdditionalServiceDto[]> =>
  apiRequest('/AdditionalService', {}, 'Błąd pobierania usług');

export const createAdditionalService = (dto: AdditionalServiceDto, token: string): Promise<void> =>
  apiRequest('/AdditionalService', { method: 'POST', token, body: dto }, 'Błąd dodawania usługi');

export const updateAdditionalService = (id: number, dto: AdditionalServiceDto, token: string): Promise<void> =>
  apiRequest(`/AdditionalService/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji usługi');

export const deleteAdditionalService = (id: number, token: string): Promise<void> =>
  apiRequest(`/AdditionalService/${id}`, { method: 'DELETE', token }, 'Błąd usuwania usługi');

// --- CENNIK SEZONOWY ---
export const getPriceListEntries = (token: string): Promise<PriceListEntryDto[]> =>
  apiRequest('/PriceListEntry', { token }, 'Błąd pobierania cennika');

export const createPriceListEntry = (dto: PriceListEntryDto, token: string): Promise<void> =>
  apiRequest('/PriceListEntry', { method: 'POST', token, body: dto }, 'Błąd dodawania wpisu w cenniku');

export const updatePriceListEntry = (id: number, dto: PriceListEntryDto, token: string): Promise<void> =>
  apiRequest(`/PriceListEntry/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji wpisu w cenniku');

export const deletePriceListEntry = (id: number, token: string): Promise<void> =>
  apiRequest(`/PriceListEntry/${id}`, { method: 'DELETE', token }, 'Błąd usuwania wpisu z cennika');

// --- UDOGODNIENIA ---
export const getAmenities = (): Promise<AmenityDto[]> =>
  apiRequest('/Amenity', {}, 'Błąd pobierania udogodnień');

export const createAmenity = (dto: AmenityDto, token: string): Promise<void> =>
  apiRequest('/Amenity', { method: 'POST', token, body: dto }, 'Błąd dodawania udogodnienia');

export const updateAmenity = (id: number, dto: AmenityDto, token: string): Promise<void> =>
  apiRequest(`/Amenity/${id}`, { method: 'PUT', token, body: dto }, 'Błąd edycji udogodnienia');

export const deleteAmenity = (id: number, token: string): Promise<void> =>
  apiRequest(`/Amenity/${id}`, { method: 'DELETE', token }, 'Błąd usuwania udogodnienia');

// --- BLOKADY POKOI ---
export const getRoomBlocks = (token: string): Promise<RoomBlockDto[]> =>
  apiRequest('/RoomBlock', { token }, 'Błąd pobierania blokad');

export const createRoomBlock = (dto: RoomBlockDto, token: string): Promise<void> =>
  apiRequest('/RoomBlock', { method: 'POST', token, body: dto }, 'Błąd tworzenia blokady');

export const deleteRoomBlock = (id: number, token: string): Promise<void> =>
  apiRequest(`/RoomBlock/${id}`, { method: 'DELETE', token }, 'Błąd usuwania blokady');

// --- OPINIE (MODERACJA) ---
export const getReviews = (): Promise<ReviewDto[]> =>
  apiRequest('/Review', {}, 'Błąd pobierania opinii');

export const deleteReview = (id: number, token: string): Promise<void> =>
  apiRequest(`/Review/${id}`, { method: 'DELETE', token }, 'Błąd usuwania opinii');

// --- ZDJĘCIA TYPÓW POKOI ---
export const uploadRoomTypePhotos = (roomTypeId: number, files: File[], token: string): Promise<void> => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  return apiRequest(`/RoomType/${roomTypeId}/photos`, { method: 'POST', token, body: formData }, 'Błąd dodawania zdjęć');
};

export const deleteRoomTypePhoto = (photoId: number, token: string): Promise<void> =>
  apiRequest(`/RoomType/photos/${photoId}`, { method: 'DELETE', token }, 'Błąd usuwania zdjęcia');

export const setMainRoomTypePhoto = (photoId: number, token: string): Promise<void> =>
  apiRequest(`/RoomType/photos/${photoId}/main`, { method: 'PUT', token }, 'Błąd ustawiania zdjęcia głównego');