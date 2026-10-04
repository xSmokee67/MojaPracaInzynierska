// Plik: Frontend/src/api/profileApi.ts
import type { ProfileDto, UpdateProfileDto, ChangePasswordDto } from '../types/profile';
import { throwApiError } from './apiErrors';
import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/Profile`;

export const getProfile = async (token: string): Promise<ProfileDto> => {
  const response = await fetch(API_URL, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) await throwApiError(response, 'Błąd pobierania danych profilu');
  return response.json();
};

export const updateProfile = async (dto: UpdateProfileDto, token: string): Promise<void> => {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) await throwApiError(response, 'Błąd zapisywania danych profilu');
};

export const changePassword = async (dto: ChangePasswordDto, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!response.ok) await throwApiError(response, 'Błąd zmiany hasła');
};