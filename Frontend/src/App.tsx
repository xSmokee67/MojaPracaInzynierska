import { useState, useEffect } from 'react';
import AuthForm from './components/AuthForm';
import ReservationForm from './components/ReservationForm';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null); // Nowy stan dla e-maila

  useEffect(() => {
    const savedToken = localStorage.getItem('jwt_token');
    const savedRole = localStorage.getItem('user_role');
    const savedEmail = localStorage.getItem('user_email'); // Pobranie e-maila
    
    if (savedToken) {
      setToken(savedToken);
      setRole(savedRole);
      setEmail(savedEmail);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, newRole: string, newEmail: string) => {
    localStorage.setItem('jwt_token', newToken);
    localStorage.setItem('user_role', newRole);
    localStorage.setItem('user_email', newEmail); // Zapis e-maila
    
    setToken(newToken);
    setRole(newRole);
    setEmail(newEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email'); // Usunięcie e-maila
    
    setToken(null);
    setRole(null);
    setEmail(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4 space-y-8">
      {/* Pasek nawigacji górnej */}
      <div className="w-full max-w-5xl flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-xl font-bold text-emerald-600">Hotel Resort API</h1>
        {token && (
          <div className="flex items-center gap-4">
            {/* Wyświetlanie adresu e-mail w pasku nawigacji */}
            <span className="text-sm font-medium text-slate-500">Zalogowano jako: {email}</span>
            <button onClick={handleLogout} className="text-sm px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">
              Wyloguj się
            </button>
          </div>
        )}
      </div>

      {/* Główna zawartość */}
      {!token ? (
        <AuthForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Lewa kolumna: Opis */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-800">Witaj w systemie rezerwacji</h2>
            <p className="text-slate-600 leading-relaxed">
              Skorzystaj z formularza obok, aby sprawdzić dostępność pokoi i dokonać rezerwacji w czasie rzeczywistym. System automatycznie uwzględni cennik sezonowy oraz aktualne blokady serwisowe.
            </p>
          </div>
          
          {/* Prawa kolumna: Formularz rezerwacji */}
          <div className="flex justify-center">
             <ReservationForm token={token} />
          </div>
        </div>
      )}
    </div>
  );
}