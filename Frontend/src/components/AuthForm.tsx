// Plik: Frontend/src/components/AuthForm.tsx
import { useState } from 'react';
import { loginUser, registerUser } from '../api/authApi';
import type { LoginDto, RegisterDto } from '../types/auth';

export default function AuthForm({ onLoginSuccess, sessionMessage }: { onLoginSuccess: (token: string, role: string, email: string, expiration: string) => void; sessionMessage: string }) {  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Stany formularza
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const payload: LoginDto = { email, password };
        const data = await loginUser(payload);
        onLoginSuccess(data.token, data.role, email, data.expiration);
      } else {
        const payload: RegisterDto = { email, password, firstName, lastName, phoneNumber };
        await registerUser(payload);
        setMessage('Rejestracja zakończona sukcesem! Możesz się teraz zalogować.');
        setIsLogin(true); // Przełącz na logowanie po udanej rejestracji
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-center text-slate-800">
        {isLogin ? 'Logowanie' : 'Rejestracja Gościa'}
      </h2>
      
      {sessionMessage && !error && !message && <div className="p-3 text-sm text-amber-800 bg-amber-100 rounded-lg">{sessionMessage}</div>}
      {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}
      {message && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-lg">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Adres e-mail</label>
          <input 
            type="email" required maxLength={100}
            className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
            value={email} onChange={(e) => setEmail(e.target.value)} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700">Hasło</label>
          <input 
            type="password" required 
            pattern={isLogin ? undefined : '(?=.*[0-9]).{8,}'}
            title={isLogin ? undefined : 'Hasło musi mieć co najmniej 8 znaków, w tym jedną cyfrę.'}
            className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
            value={password} onChange={(e) => setPassword(e.target.value)} 
          />
          {!isLogin && <p className="mt-1 text-xs text-slate-500">Minimum 8 znaków, w tym co najmniej jedna cyfra.</p>}
        </div>

        {!isLogin && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Imię</label>
                <input type="text" required maxLength={50} className="w-full px-4 py-2 mt-1 border rounded-lg outline-none" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Nazwisko</label>
                <input type="text" required maxLength={50} className="w-full px-4 py-2 mt-1 border rounded-lg outline-none" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Numer telefonu</label>
              <input type="tel" required pattern="\+?[0-9 ]{9,15}" title="Podaj 9-15 cyfr, np. +48 600 100 200." placeholder="+48 600 100 200" className="w-full px-4 py-2 mt-1 border rounded-lg outline-none" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>
          </>
        )}

        <button type="submit" className="w-full px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-semibold transition-colors">
          {isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
        </button>
      </form>

      <p className="text-sm text-center text-slate-600">
        {isLogin ? 'Nie masz jeszcze konta?' : 'Masz już konto?'}
        <button type="button" onClick={() => setIsLogin(!isLogin)} className="ml-1 text-emerald-600 hover:underline">
          {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
        </button>
      </p>
    </div>
  );
}