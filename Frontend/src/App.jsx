import { useState, useEffect, useCallback } from 'react';
import AuthForm from './components/account/AuthForm';
import ReservationForm from './components/reservations/ReservationForm';
import AdminDashboard from './components/admin/AdminDashboard';
import MyReservations from './components/reservations/MyReservations';
import RoomGallery from './components/rooms/RoomGallery';
import RoomTypeProfile from './components/rooms/RoomTypeProfile';
import UserProfile from './components/account/UserProfile';
import Footer from './components/common/Footer';
import NotificationBell from './components/common/NotificationBell';
import NotFound from './components/common/NotFound';
import { adminTabBySlug } from './components/admin/adminTabs';
import { SESSION_EXPIRED_EVENT } from './api/apiErrors';

// Proste trasy oparte o hash w adresie (#/pokoj/2, #/panel/pokoje) - działa przycisk "Wstecz" i można wysłać link do pokoju
const parseRoute = (hash) => {
  const [path] = hash.replace(/^#\/?/, '').split('?');
  const [section, id, subId] = path.split('/');
  const numericId = Number(id);
  if (section === 'pokoj' && numericId > 0) return { view: 'room', roomTypeId: numericId };
  if (section === 'rezerwacja') return { view: 'book', roomTypeId: numericId > 0 ? numericId : undefined };
  if (section === 'moje-rezerwacje') return { view: 'reservations', reservationId: numericId > 0 ? numericId : undefined };
  if (section === 'profil') return { view: 'profile' };
  if (section === 'panel') {
    const tab = adminTabBySlug(id);
    const reservationId = Number(subId);
    return { view: 'panel', tab, reservationId: tab === 'reservations' && reservationId > 0 ? reservationId : undefined };
  }
  if (section === 'logowanie') return { view: 'login' };
  // Pusty adres (#/) to strona główna, każdy inny nieznany adres - strona 404
  return section === '' ? { view: 'rooms' } : { view: 'notFound' };
};

const navigate = (path) => { window.location.hash = path; };

// Kryteria wyszukiwarki pamiętane w sesji przeglądarki - zostają po odświeżeniu strony i przechodzą do profilu i formularza
const SEARCH_STORAGE_KEY = 'hotel_search';
const loadSearch = () => {
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
  const [token, setToken] = useState(initialSession.token);
  const [role, setRole] = useState(initialSession.role);
  const [email, setEmail] = useState(initialSession.email);
  const [firstName, setFirstName] = useState(initialSession.firstName);
  const [reservationsRefreshKey, setReservationsRefreshKey] = useState(0);
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [sessionMessage, setSessionMessage] = useState(initialSession.message);
  const [search, setSearch] = useState(() => {
    // Termin z przeszłości (np. zapamiętany wczoraj) nie jest przywracany
    const saved = loadSearch();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return saved && new Date(`${saved.checkIn}T00:00:00`) >= today ? saved : null;
  });

  const handleSearch = (criteria) => {
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
    let previous = parseRoute(window.location.hash);
    const onHashChange = () => {
      const next = parseRoute(window.location.hash);
      setRoute(next);
      // Otwarcie i zamknięcie szczegółów rezerwacji (panel, "Moje rezerwacje") nie przewija listy rezerwacji na górę
      const sameReservationsTab = (previous.view === 'panel' && next.view === 'panel' && previous.tab === 'reservations' && next.tab === 'reservations')
        || (previous.view === 'reservations' && next.view === 'reservations');
      if (!sameReservationsTab) window.scrollTo(0, 0);
      previous = next;
    };
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

  const handleLoginSuccess = (newToken, newRole, newEmail, expiration, newFirstName) => {
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

  const isOwner = role === 'Owner';
  const requiresLogin = route.view === 'book' || route.view === 'reservations' || route.view === 'profile' || route.view === 'panel' || route.view === 'login';
  // Widok do wyświetlenia - trasa niedostępna dla roli (np. panel dla gościa) pokazuje stronę główną
  const page = !token && requiresLogin ? 'login'
    : route.view === 'notFound' ? 'notFound'
    : route.view === 'panel' && isOwner ? 'panel'
    : route.view === 'profile' && token ? 'profile'
    : route.view === 'room' ? 'room'
    : (route.view === 'book' || route.view === 'reservations') && token && !isOwner ? route.view
    : 'rooms';
  // Strona główna ma menu nałożone na zdjęcie hotelu, logowanie - zdjęcie na pół ekranu; pozostałe widoki - granatowy pasek i treść na środku
  const isHome = page === 'rooms';
  const navLink = (active) => `pb-1 border-b-2 font-medium transition-colors ${active ? 'text-white border-brass-400' : 'text-white/80 border-transparent hover:text-white'}`;

  return (
    <div className="min-h-screen flex flex-col bg-white text-navy-900">
      {/* Pasek nawigacji - na stronie głównej przezroczysty, nad zdjęciem hotelu (RoomGallery) */}
      <header className={isHome ? 'absolute inset-x-0 top-0 z-20' : 'bg-navy-900'}>
        <div className="max-w-page mx-auto px-4 md:px-6 py-4 md:py-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 text-2xl font-display font-semibold text-white">
            <span className="w-9 h-9 rounded-full border-[1.5px] border-brass-400 text-brass-400 text-base flex items-center justify-center" aria-hidden="true">H</span>
            Hotel Resort
          </button>

          {/* Menu nawigacji - gość (także niezalogowany) i właściciel widzą tę samą stronę główną */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] order-3 w-full md:order-none md:w-auto md:mr-auto">
            {/* Rezerwację zaczyna się od pokoju (strona pokoju -> "Zarezerwuj"), więc formularz rezerwacji też podświetla "Pokoje" */}
            <button onClick={() => navigate('/')} className={navLink(route.view === 'rooms' || route.view === 'room' || route.view === 'book')}>Pokoje</button>
            {token && !isOwner && <button onClick={() => navigate('/moje-rezerwacje')} className={navLink(route.view === 'reservations')}>Moje rezerwacje</button>}
            {token && isOwner && <button onClick={() => navigate('/panel')} className={navLink(route.view === 'panel')}>Panel właściciela</button>}
          </nav>

          {!token && route.view !== 'login' && (
            <button onClick={() => navigate('/logowanie')} className="text-[15px] font-medium text-white border border-white/60 rounded-full px-5 py-2.5 hover:bg-white/10 transition-colors">
              Zaloguj się
            </button>
          )}

          {token && (
            <div className="flex items-center gap-3 md:gap-4 text-[15px]">
              {/* Powiadomienia o zmianach w rezerwacjach - kliknięcie otwiera rezerwację (właściciel: panel, gość: "Moje rezerwacje") */}
              <NotificationBell token={token} refreshKey={route} onOpenReservation={id => navigate(isOwner ? `/panel/rezerwacje/${id}` : `/moje-rezerwacje/${id}`)} />
              <button onClick={() => navigate('/profil')} title="Mój profil" className={`max-w-[12rem] truncate ${navLink(route.view === 'profile')}`}>
                Witaj, <span className="font-semibold text-white">{firstName || email}</span>
              </button>
              <button onClick={() => handleLogout()} className="text-white border border-white/40 rounded-full px-4 py-2 hover:bg-white/10 transition-colors">
                Wyloguj
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Główny routing aplikacji */}
      <main className={isHome || page === 'login' ? 'flex-1 flex flex-col' : 'flex-1 w-full max-w-page mx-auto px-4 md:px-6 pt-8 md:pt-10 pb-16 flex flex-col items-center'}>
        {page === 'login' ? (
          // Rezerwacja, "Moje rezerwacje", profil i panel wymagają zalogowania - po zalogowaniu zostajemy na tej samej trasie
          <AuthForm onLoginSuccess={handleLoginSuccess} sessionMessage={sessionMessage || (route.view === 'book' ? 'Zaloguj się lub załóż konto, aby zarezerwować pokój.' : '')} />
        ) : page === 'notFound' ? (
          // STRONA 404 - nieznany adres
          <NotFound onHome={() => navigate('/')} />
        ) : page === 'panel' ? (
          // PANEL WŁAŚCICIELA - każda zakładka pod własnym adresem
          <AdminDashboard token={token} tab={route.tab} reservationId={route.reservationId} onNavigate={navigate} />
        ) : page === 'profile' ? (
          // MÓJ PROFIL (gość i właściciel)
          <UserProfile token={token} onNavigate={navigate} />
        ) : page === 'room' ? (
          // PROFIL POKOJU (publiczny; właściciel widzi go bez przycisku rezerwacji)
          <RoomTypeProfile roomTypeId={route.roomTypeId} search={search} canBook={!isOwner} onBook={id => navigate(`/rezerwacja/${id}`)} onSearch={handleSearch} onBack={() => navigate('/')} />
        ) : page === 'book' ? (
          // WIDOK GOŚCIA - rezerwacja (podsumowanie ceny obok wyboru usług - ReservationForm)
          <ReservationForm key={route.roomTypeId ?? 0} token={token} initialRoomTypeId={route.roomTypeId} initialCheckIn={search?.checkIn} initialCheckOut={search?.checkOut} initialGuests={search?.guests} onReservationCreated={() => setReservationsRefreshKey(prev => prev + 1)} onNavigate={navigate} />
        ) : page === 'reservations' ? (
          // WIDOK GOŚCIA - moje rezerwacje
          <MyReservations token={token} refreshKey={reservationsRefreshKey} selectedReservationId={route.reservationId ?? null} onSelectReservation={id => navigate(id ? `/moje-rezerwacje/${id}` : '/moje-rezerwacje')} />
        ) : (
          // STRONA GŁÓWNA - galeria pokoi (publiczna, także dla właściciela)
          <RoomGallery search={search} onSearch={handleSearch} onClearSearch={() => handleSearch(null)} onSelect={id => navigate(`/pokoj/${id}`)} />
        )}
      </main>

      <Footer />
    </div>
  );
}