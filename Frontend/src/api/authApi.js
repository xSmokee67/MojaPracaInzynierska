import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/Auth`;

// Logowanie i rejestracja nie korzystają z apiRequest (apiClient.js): tam odpowiedź 401 oznacza wygasłą sesję
// i wylogowuje użytkownika, a tutaj 401 przy logowaniu oznacza po prostu złe hasło (komunikat z API).

export const loginUser = async (data) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Nieprawidłowy email lub hasło.');
  }

  return response.json();
};

export const registerUser = async (data) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Wystąpił błąd podczas rejestracji użytkownika.');
  }
};
