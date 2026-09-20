import type { LoginDto, RegisterDto, AuthResponse } from '../types/auth';

const API_URL = 'http://localhost:5285/api/Auth';

export const loginUser = async (data: LoginDto): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('Nieprawidłowy email lub hasło.');
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
        const errorData = await response.text();
        throw new Error(errorData || 'Wystąpił błąd podczas rejestracji użytkownika.');
    }
};