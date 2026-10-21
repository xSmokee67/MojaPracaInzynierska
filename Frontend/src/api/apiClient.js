// Plik: Frontend/src/api/apiClient.js
import { throwApiError } from './apiErrors';
import { API_BASE_URL } from './config';

// Wspólne wywołanie API - adres serwera, nagłówki (JSON, token JWT) i obsługa błędów w jednym miejscu.
// path: ścieżka po /api, np. '/Room/5'; errorMessage: komunikat, gdy API nie zwróci własnego { error }
// options: { method: 'GET' | 'POST' | 'PUT' | 'DELETE', token: token JWT zalogowanego użytkownika (nagłówek Authorization),
//            body: obiekt wysyłany jako JSON albo FormData (przesyłanie zdjęć) }
export const apiRequest = async (path, options, errorMessage) => {
  const { method = 'GET', token, body } = options;
  const isFormData = body instanceof FormData;

  const headers = {};
  // Przy FormData bez Content-Type - przeglądarka sama ustawia multipart/form-data z granicą (boundary)
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  // 401 (wylogowanie), 403 i komunikat { error } z API - apiErrors.js
  if (!response.ok) await throwApiError(response, errorMessage);

  // Odpowiedź JSON (dane albo { message }); pusta treść - brak danych
  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
};