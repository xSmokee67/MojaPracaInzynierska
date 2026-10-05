// Plik: Frontend/src/api/profileApi.ts
import type { ProfileDto, UpdateProfileDto, ChangePasswordDto } from '../types/profile';
import { apiRequest } from './apiClient';

export const getProfile = (token: string): Promise<ProfileDto> =>
  apiRequest('/Profile', { token }, 'Błąd pobierania danych profilu');

export const updateProfile = (dto: UpdateProfileDto, token: string): Promise<void> =>
  apiRequest('/Profile', { method: 'PUT', token, body: dto }, 'Błąd zapisywania danych profilu');

export const changePassword = (dto: ChangePasswordDto, token: string): Promise<void> =>
  apiRequest('/Profile/password', { method: 'PUT', token, body: dto }, 'Błąd zmiany hasła');