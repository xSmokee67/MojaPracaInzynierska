// Plik: Frontend/src/api/profileApi.js
import { apiRequest } from './apiClient';

export const getProfile = (token) =>
  apiRequest('/Profile', { token }, 'Błąd pobierania danych profilu');