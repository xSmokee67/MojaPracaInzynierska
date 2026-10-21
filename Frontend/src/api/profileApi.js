// Plik: Frontend/src/api/profileApi.js
import { apiRequest } from './apiClient';

export const getProfile = (token) =>
  apiRequest('/Profile', { token }, 'Błąd pobierania danych profilu');

export const updateProfile = (dto, token) =>
  apiRequest('/Profile', { method: 'PUT', token, body: dto }, 'Błąd zapisywania danych profilu');

export const changePassword = (dto, token) =>
  apiRequest('/Profile/password', { method: 'PUT', token, body: dto }, 'Błąd zmiany hasła');