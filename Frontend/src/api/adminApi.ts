// Plik: Frontend/src/api/adminApi.ts
import type { RoomTypeDto, RoomDto, AdditionalServiceDto, PriceListEntryDto, AmenityDto, RoomBlockDto } from '../types/admin';
import type { ReviewDto } from '../types/reservation';

const API_URL = 'http://localhost:5285/api';

// --- TYPY POKOI ---
export const getRoomTypes = async (): Promise<RoomTypeDto[]> => {
  const response = await fetch(`${API_URL}/RoomType`);
  if (!response.ok) throw new Error('Błąd pobierania typów pokoi');
  return response.json();
};

export const createRoomType = async (dto: RoomTypeDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/RoomType`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd tworzenia typu pokoju');
  }
};

export const updateRoomType = async (id: number, dto: RoomTypeDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/RoomType/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd edycji typu pokoju');
  }
};

export const deleteRoomType = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/RoomType/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd usuwania typu pokoju');
  }
};

// --- POKOJE FIZYCZNE ---
export const getRooms = async (token: string): Promise<RoomDto[]> => {
  const response = await fetch(`${API_URL}/Room`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Błąd pobierania pokoi');
  return response.json();
};

export const createRoom = async (dto: RoomDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/Room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd tworzenia pokoju');
  }
};

export const updateRoom = async (id: number, dto: RoomDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/Room/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd edycji pokoju');
  }
};

export const deleteRoom = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/Room/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd usuwania pokoju');
  }
};

// --- USŁUGI DODATKOWE ---
export const getAdditionalServices = async (): Promise<AdditionalServiceDto[]> => {
  const response = await fetch(`${API_URL}/AdditionalService`);
  if (!response.ok) throw new Error('Błąd pobierania usług');
  return response.json();
};

export const createAdditionalService = async (dto: AdditionalServiceDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/AdditionalService`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd dodawania usługi');
  }
};

export const updateAdditionalService = async (id: number, dto: AdditionalServiceDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/AdditionalService/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd edycji usługi');
  }
};

export const deleteAdditionalService = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/AdditionalService/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd usuwania usługi');
  }
};

// --- CENNIK SEZONOWY ---
export const getPriceListEntries = async (token: string): Promise<PriceListEntryDto[]> => {
  const response = await fetch(`${API_URL}/PriceListEntry`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Błąd pobierania cennika');
  return response.json();
};

export const createPriceListEntry = async (dto: PriceListEntryDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/PriceListEntry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || errorData || 'Błąd dodawania wpisu w cenniku');
  }
};

export const updatePriceListEntry = async (id: number, dto: PriceListEntryDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/PriceListEntry/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd edycji wpisu w cenniku');
  }
};

export const deletePriceListEntry = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/PriceListEntry/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd usuwania wpisu z cennika');
  }
};

// --- UDOGODNIENIA ---
export const getAmenities = async (): Promise<AmenityDto[]> => {
  const response = await fetch(`${API_URL}/Amenity`);
  if (!response.ok) throw new Error('Błąd pobierania udogodnień');
  return response.json();
};

export const createAmenity = async (dto: AmenityDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/Amenity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd dodawania udogodnienia');
  }
};

export const updateAmenity = async (id: number, dto: AmenityDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/Amenity/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd edycji udogodnienia');
  }
};

export const deleteAmenity = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/Amenity/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd usuwania udogodnienia');
  }
};

// --- BLOKADY POKOI ---
export const getRoomBlocks = async (token: string): Promise<RoomBlockDto[]> => {
  const response = await fetch(`${API_URL}/RoomBlock`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Błąd pobierania blokad');
  return response.json();
};

export const createRoomBlock = async (dto: RoomBlockDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/RoomBlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd tworzenia blokady');
  }
};

export const deleteRoomBlock = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/RoomBlock/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd usuwania blokady');
  }
};

// --- OPINIE (MODERACJA) ---
export const getReviews = async (): Promise<ReviewDto[]> => {
  const response = await fetch(`${API_URL}/Review`);
  if (!response.ok) throw new Error('Błąd pobierania opinii');
  return response.json();
};

export const deleteReview = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/Review/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Błąd usuwania opinii');
  }
};