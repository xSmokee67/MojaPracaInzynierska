// Plik: Frontend/src/api/notificationApi.js
import { apiRequest } from './apiClient';

// Powiadomienia zalogowanego użytkownika (najnowsze na początku)
export const getNotifications = (token) =>
  apiRequest('/Notification', { token }, 'Błąd pobierania powiadomień');

export const markNotificationRead = (id, token) =>
  apiRequest(`/Notification/${id}/read`, { method: 'PUT', token }, 'Błąd oznaczania powiadomienia');

export const markAllNotificationsRead = (token) =>
  apiRequest('/Notification/read-all', { method: 'PUT', token }, 'Błąd oznaczania powiadomień');