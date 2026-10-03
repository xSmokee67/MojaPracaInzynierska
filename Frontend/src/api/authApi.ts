import type { LoginDto, RegisterDto, AuthResponse } from '../types/auth';
import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/Auth`;

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