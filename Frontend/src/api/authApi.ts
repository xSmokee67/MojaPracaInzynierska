import type { LoginDto, RegisterDto, AuthResponse, ResetPasswordDto } from '../types/auth';
import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/Auth`;

// Logowanie i rejestracja nie korzystają z apiRequest (apiClient.ts): tam odpowiedź 401 oznacza wygasłą sesję
// i wylogowuje użytkownika, a tutaj 401 przy logowaniu oznacza po prostu złe hasło (komunikat z API).

export const loginUser = async (data: LoginDto): Promise<AuthResponse> => {
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

export const registerUser = async (data: RegisterDto): Promise<void> => {
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

// Reset hasła - krok 1: wysłanie linku na e-mail
export const forgotPassword = async (email: string): Promise<string> => {
  const response = await fetch(`${API_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Nie udało się wysłać linku do resetu hasła.');
  return data.message;
};

// Reset hasła - krok 2: nowe hasło z tokenem z linku
export const resetPassword = async (dto: ResetPasswordDto): Promise<string> => {
  const response = await fetch(`${API_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Nie udało się zmienić hasła.');
  return data.message;
};