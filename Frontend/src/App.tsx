// Plik: Frontend/src/App.tsx
import { useState, useEffect } from 'react';
import AuthForm from './components/AuthForm';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Sprawdź przy starcie aplikacji, czy token jest już w pamięci przeglądarki
  useEffect(() => {
    const savedToken = localStorage.getItem('jwt_token');
    const savedRole = localStorage.getItem('user_role');
    if (savedToken) {
      setToken(savedToken);
      setRole(savedRole);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, newRole: string) => {
    localStorage.setItem('jwt_token', newToken);
    localStorage.setItem('user_role', newRole);
    setToken(newToken);
    setRole(newRole);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    setToken(null);
    setRole(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      {!token ? (
        <AuthForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Zalogowano pomyślnie</h2>
          <p className="text-slate-600">
            Twój aktualny poziom uprawnień to: <br/>
            <span className="font-bold text-emerald-600 uppercase text-lg">{role}</span>
          </p>
          <div className="p-3 bg-slate-50 border rounded-lg text-xs text-left text-slate-500 break-all">
            <strong>Twój token JWT:</strong><br />
            {token}
          </div>
          <button 
            onClick={handleLogout}
            className="w-full px-4 py-2 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold transition-colors">
            Wyloguj się
          </button>
        </div>
      )}
    </div>
  );
}