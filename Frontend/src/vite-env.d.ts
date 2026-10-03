/// <reference types="vite/client" />

// Zmienne środowiskowe z pliku Frontend/.env
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}