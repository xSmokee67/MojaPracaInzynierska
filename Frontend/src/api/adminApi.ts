// Plik: Frontend/src/api/adminApi.ts
import type { RoomTypeDto, RoomDto, AdditionalServiceDto, PriceListEntryDto } from '../types/admin';

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
  if (!response.ok) throw new Error('Błąd tworzenia typu pokoju');
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
  if (!response.ok) throw new Error('Błąd tworzenia pokoju');
};

export const deleteRoom = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/Room/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Błąd usuwania pokoju');
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
  if (!response.ok) throw new Error('Błąd dodawania usługi');
};

export const deleteAdditionalService = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/AdditionalService/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Błąd usuwania usługi');
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

export const deletePriceListEntry = async (id: number, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/PriceListEntry/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Błąd usuwania wpisu z cennika');
};