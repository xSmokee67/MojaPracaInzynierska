// Plik: Frontend/src/api/apiErrors.ts

// Nazwa zdarzenia, na które nasłuchuje App.tsx - wylogowanie po wygaśnięciu sesji
export const SESSION_EXPIRED_EVENT = 'session-expired';

// Wspólna obsługa błędnej odpowiedzi API:
// - 401 (brak lub wygasły token JWT) - API zwraca pustą treść, więc nie parsujemy JSON-a, tylko wylogowujemy
// - 403 (brak uprawnień roli)
// - pozostałe - komunikat { error } z API albo komunikat domyślny
export const throwApiError = async (response: Response, fallbackMessage: string): Promise<never> => {
  if (response.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new Error('Sesja wygasła. Zaloguj się ponownie.');
  }

  if (response.status === 403) {
    throw new Error('Nie masz uprawnień do wykonania tej operacji.');
  }

  const errorData = await response.json().catch(() => null);
  throw new Error(errorData?.error || fallbackMessage);
};

// Treść błędu do wyświetlenia w komponencie (API rzuca Error z komunikatem z odpowiedzi)
export const errorMessage = (err: unknown): string => err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd.';