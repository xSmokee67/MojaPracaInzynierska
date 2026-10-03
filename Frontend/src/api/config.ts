// Plik: Frontend/src/api/config.ts

// Adres serwera API ustawiany w pliku Frontend/.env (VITE_API_URL) - jedno miejsce dla całej aplikacji
export const SERVER_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5285';
export const API_BASE_URL = `${SERVER_URL}/api`;