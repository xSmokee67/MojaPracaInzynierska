import { useState, useEffect, useCallback } from 'react';
import AuthForm from './components/AuthForm';
import ReservationForm from './components/ReservationForm';
import AdminDashboard from './components/AdminDashboard';
import MyReservations from './components/MyReservations';
import RoomGallery from './components/RoomGallery';
import RoomTypeProfile from './components/RoomTypeProfile';
import UserProfile from './components/UserProfile';
import { SESSION_EXPIRED_EVENT } from './api/apiErrors';
import type { SearchCriteria } from './types/room';

// Proste trasy oparte o hash w adresie (#/pokoj/2) - działa przycisk "Wstecz" i można wysłać link do pokoju
type Route =
  | { view: 'rooms' }
  | { view: 'room'; roomTypeId: number }
  | { view: 'book'; roomTypeId?: number }
  | { view: 'reservations' }
  | { view: 'profile' }
  | { view: 'panel' }
  | { view: 'login' };

const parseRoute = (hash: string): Route => {
  const [section, id] = hash.replace(/^#\/?/, '').split('/');
  const numericId = Number(id);
  if (section === 'pokoj' && numericId > 0) return { view: 'room', roomTypeId: numericId };
  if (section === 'rezerwacja') return { view: 'book', roomTypeId: numericId > 0 ? numericId : undefined };
  if (section === 'moje-rezerwacje') return { view: 'reservations' };
  if (section === 'profil') return { view: 'profile' };
  if (section === 'panel') return { view: 'panel' };
  if (section === 'logowanie') return { view: 'login' };
  return { view: 'rooms' };
};

const navigate = (path: string) => { window.location.hash = path; };

// Kryteria wyszukiwarki pamiętane w sesji przeglądarki - zostają po odświeżeniu strony i przechodzą do profilu i formularza
const SEARCH_STORAGE_KEY = 'hotel_search';
const loadSearch = (): SearchCriteria | null => {
  try {
    const saved = sessionStorage.getItem(SEARCH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Sesja zapisana w localStorage - przywracana przy starcie aplikacji, jeśli token nie wygasł
const SESSION_KEYS = ['jwt_token', 'user_role', 'user_email', 'user_first_name', 'token_expiration'];
const clearSession = () => SESSION_KEYS.forEach(key => localStorage.removeItem(key));
const loadSession = () => {
  const savedToken = localStorage.getItem('jwt_token');
  const savedExpiration = localStorage.getItem('token_expiration');

  // Token po terminie ważności - nie przywracamy sesji
  if (savedToken && savedExpiration && new Date(savedExpiration).getTime() <= Date.now()) {
    clearSession();
    return { token: null, role: null, email: null, firstName: null, message: 'Sesja wygasła. Zaloguj się ponownie.' };
  }

  return { token: savedToken, role: localStorage.getItem('user_role'), email: localStorage.getItem('user_email'), firstName: localStorage.getItem('user_first_name'), message: '' };
};

export default function App() {
  const [initialSession] = useState(loadSession);
  const [token, setToken] = useState<string | null>(initialSession.token);
  const [role, setRole] = useState<string | null>(initialSession.role);
  const [email, setEmail] = useState<string | null>(initialSession.email);
  const [firstName, setFirstName] = useState<string | null>(initialSession.firstName);
  const [reservationsRefreshKey, setReservationsRefreshKey] = useState(0);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const [sessionMessage, setSessionMessage] = useState(initialSession.message);
  const [search, setSearch] = useState<SearchCriteria | null>(() => {
    // Termin z przeszłości (np. zapamiętany wczoraj) nie jest przywracany
    const saved = loadSearch();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return saved && new Date(`${saved.checkIn}T00:00:00`) >= today ? saved : null;
  });

  const handleSearch = (criteria: SearchCriteria | null) => {
    setSearch(criteria);
    try {
      if (criteria) sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(criteria));
      else sessionStorage.removeItem(SEARCH_STORAGE_KEY);
    } catch {
      // brak dostępu do sessionStorage (np. tryb prywatny) - wyszukiwanie działa bez zapamiętywania
    }
  };

  const handleLogout = useCallback((reason = '') => {
    clearSession();

    setToken(null);
    setRole(null);
    setEmail(null);
    setFirstName(null);
    setSessionMessage(reason);

    // Ręczne wylogowanie z tras dostępnych tylko po zalogowaniu - powrót na stronę główną.
    // Przy wygaśnięciu sesji (reason) zostajemy na miejscu: pojawi się logowanie z komunikatem, a potem powrót do formularza
    const currentView = parseRoute(window.location.hash).view;
    if (!reason && (currentView === 'book' || currentView === 'reservations' || currentView === 'profile' || currentView === 'panel')) navigate('/');
  }, []);

  // Zmiana adresu (kliknięcie linku, przycisk "Wstecz") przełącza widok
  useEffect(() => {
    const onHashChange = () => { setRoute(parseRoute(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Automatyczne wylogowanie w momencie wygaśnięcia tokenu JWT (API ustawia ważność na 3 godziny)
  useEffect(() => {
    const savedExpiration = localStorage.getItem('token_expiration');
    if (!token || !savedExpiration) return;

    const timeLeft = new Date(savedExpiration).getTime() - Date.now();
    const timer = setTimeout(() => handleLogout('Sesja wygasła. Zaloguj się ponownie.'), Math.max(timeLeft, 0));
    return () => clearTimeout(timer);
  }, [token, handleLogout]);

  // API zwróciło 401 (token wygasł lub jest nieważny) - wylogowanie z komunikatem
  useEffect(() => {
    const onSessionExpired = () => handleLogout('Sesja wygasła. Zaloguj się ponownie.');
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [handleLogout]);

  const handleLoginSuccess = (newToken: string, newRole: string, newEmail: string, expiration: string, newFirstName: string) => {
    localStorage.setItem('jwt_token', newToken);
    localStorage.setItem('user_role', newRole);
    localStorage.setItem('user_email', newEmail); // Zapis e-maila
    localStorage.setItem('user_first_name', newFirstName); // Imię do powitania w pasku
    localStorage.setItem('token_expiration', expiration);

    setToken(newToken);
    setRole(newRole);
    setEmail(newEmail);
    setFirstName(newFirstName);
    setSessionMessage('');

    // Po logowaniu z przycisku "Zaloguj się" wracamy na stronę główną;
    // przy logowaniu w trakcie rezerwacji zostajemy na tej samej trasie (#/rezerwacja/2)
    if (route.view === 'login') navigate('/');
  };

  // Zmiana imienia na stronie "Mój profil" - od razu widoczna w powitaniu
  const handleProfileUpdated = (newFirstName: string) => {
    localStorage.setItem('user_first_name', newFirstName);
    setFirstName(newFirstName);
  };

  const isOwner = role === 'Owner';
  const navButton = (active: boolean) => `flex-1 md:flex-none px-4 py-2 rounded-lg font-semibold transition-colors ${active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;
  const ownerButton = (active: boolean) => `flex-1 md:flex-none px-4 py-2 rounded-lg font-semibold text-white transition-colors ${active ? 'bg-red-700 ring-2 ring-red-300' : 'bg-red-600 hover:bg-red-700'}`;
  const requiresLogin = route.view === 'book' || route.view === 'reservations' || route.view === 'profile' || route.view === 'panel' || route.view === 'login';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6 md:py-10 px-4 space-y-8">
      {/* Pasek nawigacji */}
      <div className="w-full max-w-6xl flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
        <button onClick={() => navigate('/')} className="text-xl font-bold text-emerald-600">Hotel Resort</button>

        {/* Menu nawigacji - gość (także niezalogowany) i właściciel widzą tę samą stronę główną */}
        <nav className="flex gap-2 order-3 w-full md:order-none md:w-auto">
          <button onClick={() => navigate('/')} className={navButton(route.view === 'rooms' || route.view === 'room')}>Pokoje</button>
          {token && !isOwner && <button onClick={() => navigate('/rezerwacja')} className={navButton(route.view === 'book')}>Zarezerwuj pobyt</button>}
          {token && !isOwner && <button onClick={() => navigate('/moje-rezerwacje')} className={navButton(route.view === 'reservations')}>Moje rezerwacje</button>}
          {token && isOwner && <button onClick={() => navigate('/panel')} className={ownerButton(route.view === 'panel')}>Panel Właściciela</button>}
        </nav>

        {!token && route.view !== 'login' && (
          <button onClick={() => navigate('/logowanie')} className="text-sm px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700">
            Zaloguj się
          </button>
        )}

        {token && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 max-w-[12rem] truncate">
              Witaj, <span className="font-semibold text-slate-800">{firstName || email}</span>
            </span>
            <button onClick={() => navigate('/profil')} className={`text-sm px-4 py-2 rounded-lg font-semibold transition-colors ${route.view === 'profile' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              Mój profil
            </button>
            <button onClick={() => handleLogout()} className="text-sm px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">
              Wyloguj się
            </button>
          </div>
        )}
      </div>

      {/* Główny routing aplikacji */}
      {!token && requiresLogin ? (
        // Rezerwacja, "Moje rezerwacje", profil i panel wymagają zalogowania - po zalogowaniu zostajemy na tej samej trasie
        <AuthForm onLoginSuccess={handleLoginSuccess} sessionMessage={sessionMessage || (route.view === 'book' ? 'Zaloguj się lub załóż konto, aby zarezerwować pokój.' : '')} />
      ) : token && isOwner && route.view === 'panel' ? (
        // PANEL WŁAŚCICIELA (czerwony przycisk w pasku nawigacji)
        <AdminDashboard token={token} />
      ) : token && route.view === 'profile' ? (
        // MÓJ PROFIL (gość i właściciel)
        <UserProfile token={token} onProfileUpdated={handleProfileUpdated} onNavigate={navigate} />
      ) : route.view === 'room' ? (
        // PROFIL POKOJU (publiczny; właściciel widzi go bez przycisku rezerwacji)
        <RoomTypeProfile roomTypeId={route.roomTypeId} search={search} canBook={!isOwner} onBook={id => navigate(`/rezerwacja/${id}`)} onBack={() => navigate('/')} />
      ) : token && !isOwner && route.view === 'book' ? (
        // WIDOK GOŚCIA - rezerwacja
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-800">Witaj w systemie rezerwacji</h2>
            <p className="text-slate-600 leading-relaxed">
              Skorzystaj z formularza obok, aby sprawdzić dostępność pokoi i dokonać rezerwacji w czasie rzeczywistym.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Swoje rezerwacje, płatności i faktury znajdziesz w zakładce <button onClick={() => navigate('/moje-rezerwacje')} className="text-emerald-600 font-semibold hover:underline">Moje rezerwacje</button>.
            </p>
          </div>
          <div className="flex justify-center">
             <ReservationForm key={route.roomTypeId ?? 0} token={token} initialRoomTypeId={route.roomTypeId} initialCheckIn={search?.checkIn} initialCheckOut={search?.checkOut} onReservationCreated={() => setReservationsRefreshKey(prev => prev + 1)} />
          </div>
        </div>
      ) : token && !isOwner && route.view === 'reservations' ? (
        // WIDOK GOŚCIA - moje rezerwacje
        <MyReservations token={token} refreshKey={reservationsRefreshKey} />
      ) : (
        // STRONA GŁÓWNA - galeria pokoi (publiczna, także dla właściciela)
        <RoomGallery search={search} onSearch={handleSearch} onClearSearch={() => handleSearch(null)} onSelect={id => navigate(`/pokoj/${id}`)} />
      )}
    </div>
  );
}