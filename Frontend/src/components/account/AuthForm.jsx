// Plik: Frontend/src/components/account/AuthForm.jsx
import { useState } from 'react';
import { loginUser, registerUser } from '../../api/authApi';
import { errorMessage } from '../../api/apiErrors';
import Alert from '../common/Alert';

// Ekran logowania i rejestracji: zdjęcie hotelu na lewej połowie, formularz na prawej (na telefonie - jedno pod drugim)
export default function AuthForm({ onLoginSuccess, sessionMessage }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Stany formularza
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const payload = { email, password };
        const data = await loginUser(payload);
        onLoginSuccess(data.token, data.role, email, data.expiration, data.firstName);
      } else {
        const payload = { email, password, firstName, lastName, phoneNumber };
        await registerUser(payload);
        setMessage('Rejestracja zakończona sukcesem! Możesz się teraz zalogować.');
        setIsLogin(true); // Przełącz na logowanie po udanej rejestracji
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const tab = (active) => `rounded-[9px] py-3 text-[15px] font-semibold transition-colors ${active ? 'bg-white text-navy-900 shadow-[0_1px_4px_rgb(20_33_61_/_0.12)]' : 'text-slate-500 hover:text-navy-900'}`;
  const switchTo = (login) => { setIsLogin(login); setError(''); setMessage(''); };

  return (
    <div className="flex-1 flex flex-wrap">
      {/* Lewa połowa: zdjęcie hotelu */}
      <div className="login-photo flex-[1_1_30rem] min-h-64 md:min-h-[28rem] px-6 md:px-10 py-8 md:py-10 flex flex-col justify-end">
        <div className="max-w-md">
          <p className="font-display text-3xl md:text-[2.5rem] leading-tight text-white">Twoje rezerwacje, płatności i faktury w jednym miejscu.</p>
          <p className="mt-3.5 text-base leading-relaxed text-white/85">Konto pozwala zarezerwować pokój, zmienić termin, anulować pobyt i wystawić opinię.</p>
        </div>
      </div>

      {/* Prawa połowa: formularz */}
      <div className="flex-[1_1_30rem] flex items-center justify-center px-4 md:px-6 py-10 md:py-12">
        <div className="w-full max-w-[26rem] space-y-6">
          <div role="tablist" aria-label="Logowanie lub rejestracja" className="grid grid-cols-2 rounded-xl bg-sand-100 p-1">
            <button type="button" role="tab" aria-selected={isLogin} onClick={() => switchTo(true)} className={tab(isLogin)}>Logowanie</button>
            <button type="button" role="tab" aria-selected={!isLogin} onClick={() => switchTo(false)} className={tab(!isLogin)}>Rejestracja</button>
          </div>

          <h1 className="text-3xl md:text-4xl font-medium">{isLogin ? 'Witaj ponownie' : 'Załóż konto'}</h1>

          {sessionMessage && !error && !message && <div className="px-4 py-3 rounded-xl border border-warning-50 bg-warning-50 text-sm font-medium text-warning-700">{sessionMessage}</div>}
          {error && <Alert type="error" message={error} />}
          {message && <Alert type="success" message={message} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <label className="field-label min-w-0">Imię
                  <input type="text" required maxLength={50} className="field font-normal" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </label>
                <label className="field-label min-w-0">Nazwisko
                  <input type="text" required maxLength={50} className="field font-normal" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </label>
              </div>
            )}
            {!isLogin && (
              <label className="field-label">Telefon
                <input type="tel" required pattern="\+?[0-9 ]{9,15}" title="Podaj 9-15 cyfr, np. +48 600 100 200." placeholder="+48 600 100 200" className="field font-normal" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </label>
            )}

            <label className="field-label">E-mail
              <input type="email" required maxLength={100} placeholder="anna@przyklad.pl" className="field font-normal" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label className="field-label">Hasło
              <input
                type="password" required
                pattern={isLogin ? undefined : '(?=.*[0-9]).{8,}'}
                title={isLogin ? undefined : 'Hasło musi mieć co najmniej 8 znaków, w tym jedną cyfrę.'}
                className="field font-normal"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              {!isLogin && <span className="text-[13px] font-normal text-slate-500">Co najmniej 8 znaków, w tym cyfra.</span>}
            </label>

            <button type="submit" className="btn-primary w-full py-4">
              {isLogin ? 'Zaloguj się' : 'Załóż konto'}
            </button>
          </form>

          {/* Blokada konta po nieudanych logowaniach - ustawienia Identity w API (5 prób, 15 minut) */}
          {isLogin && <p className="text-sm text-slate-500">Po 5 nieudanych próbach konto blokuje się na 15 minut.</p>}
        </div>
      </div>
    </div>
  );
}
