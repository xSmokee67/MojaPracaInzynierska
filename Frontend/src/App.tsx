import { useState, useEffect } from 'react';
import AuthForm from './components/AuthForm';
import ReservationForm from './components/ReservationForm';
import AdminDashboard from './components/AdminDashboard';
import MyReservations from './components/MyReservations';
import { SESSION_EXPIRED_EVENT } from './api/apiErrors';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [reservationsRefreshKey, setReservationsRefreshKey] = useState(0);
  const [guestTab, setGuestTab] = useState<'book' | 'reservations'>('book');
  const [sessionMessage, setSessionMessage] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('jwt_token');
    const savedRole = localStorage.getItem('user_role');
    const savedEmail = localStorage.getItem('user_email');
    const savedExpiration = localStorage.getItem('token_expiration');

    if (savedToken) {
      // Token po terminie ważności - nie przywracamy sesji
      if (savedExpiration && new Date(savedExpiration).getTime() <= Date.now()) {
        handleLogout('Sesja wygasła. Zaloguj się ponownie.');
        return;
      }

      setToken(savedToken);
      setRole(savedRole);
      setEmail(savedEmail);
    }
  }, []);

  // Automatyczne wylogowanie w momencie wygaśnięcia tokenu JWT (API ustawia ważność na 3 godziny)
  useEffect(() => {
    const savedExpiration = localStorage.getItem('token_expiration');
    if (!token || !savedExpiration) return;

    const timeLeft = new Date(savedExpiration).getTime() - Date.now();
    const timer = setTimeout(() => handleLogout('Sesja wygasła. Zaloguj się ponownie.'), Math.max(timeLeft, 0));
    return () => clearTimeout(timer);
  }, [token]);

  // API zwróciło 401 (token wygasł lub jest nieważny) - wylogowanie z komunikatem
  useEffect(() => {
    const onSessionExpired = () => handleLogout('Sesja wygasła. Zaloguj się ponownie.');
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  const handleLoginSuccess = (newToken: string, newRole: string, newEmail: string, expiration: string) => {
    localStorage.setItem('jwt_token', newToken);
    localStorage.setItem('user_role', newRole);
    localStorage.setItem('user_email', newEmail); // Zapis e-maila
    localStorage.setItem('token_expiration', expiration);

    setToken(newToken);
    setRole(newRole);
    setEmail(newEmail);
    setGuestTab('book');
    setSessionMessage('');
  };

  const handleLogout = (reason = '') => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email'); // Usunięcie e-maila
    localStorage.removeItem('token_expiration');

    setToken(null);
    setRole(null);
    setEmail(null);
    setSessionMessage(reason);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6 md:py-10 px-4 space-y-8">
      {/* Pasek nawigacji */}
      <div className="w-full max-w-6xl flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-xl font-bold text-emerald-600">Hotel Resort API</h1>

        {/* Menu nawigacji gościa */}
        {token && role !== 'Owner' && (
          <nav className="flex gap-2 order-3 w-full md:order-none md:w-auto">
            <button onClick={() => setGuestTab('book')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-semibold transition-colors ${guestTab === 'book' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Zarezerwuj pobyt</button>
            <button onClick={() => setGuestTab('reservations')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-semibold transition-colors ${guestTab === 'reservations' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Moje rezerwacje</button>
          </nav>
        )}

        {token && (
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm font-medium text-slate-500">
              {role === 'Owner' ? 'Administrator: ' : 'Zalogowano jako: '} {email}
            </span>
            <button onClick={() => handleLogout()} className="text-sm px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">
              Wyloguj się
            </button>
          </div>
        )}
      </div>

      {/* Główny routing aplikacji */}
      {!token ? (
        <AuthForm onLoginSuccess={handleLoginSuccess} sessionMessage={sessionMessage} />
      ) : role === 'Owner' ? (
        // WIDOK WŁAŚCICIELA
        <AdminDashboard token={token} />
      ) : guestTab === 'book' ? (
        // WIDOK GOŚCIA - rezerwacja
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-800">Witaj w systemie rezerwacji</h2>
            <p className="text-slate-600 leading-relaxed">
              Skorzystaj z formularza obok, aby sprawdzić dostępność pokoi i dokonać rezerwacji w czasie rzeczywistym.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Swoje rezerwacje, płatności i faktury znajdziesz w zakładce <button onClick={() => setGuestTab('reservations')} className="text-emerald-600 font-semibold hover:underline">Moje rezerwacje</button>.
            </p>
          </div>
          <div className="flex justify-center">
             <ReservationForm token={token} onReservationCreated={() => setReservationsRefreshKey(prev => prev + 1)} />
          </div>
        </div>
      ) : (
        // WIDOK GOŚCIA - moje rezerwacje
        <MyReservations token={token} refreshKey={reservationsRefreshKey} />
      )}
    </div>
  );
}