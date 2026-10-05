// Plik: Frontend/src/components/ResetPasswordForm.tsx
import { useState } from 'react';
import { resetPassword } from '../api/authApi';
import { errorMessage } from '../api/apiErrors';
import Alert from './Alert';

// Reset hasła - krok 2: nowe hasło; e-mail i token pochodzą z linku w wiadomości (#/reset-hasla?email=...&token=...)
export default function ResetPasswordForm({ email, token, onGoToLogin, onRequestNewLink }: { email: string; token: string; onGoToLogin: () => void; onRequestNewLink: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isLinkComplete = email !== '' && token !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== repeatPassword) { setError('Hasła nie są takie same.'); return; }
    try {
      setMessage(await resetPassword({ email, token, newPassword }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-center text-slate-800">Ustaw nowe hasło</h2>

      {error && <Alert type="error" message={error} />}

      {message ? (
        <div className="space-y-4">
          <Alert type="success" message={message} />
          <button type="button" onClick={onGoToLogin} className="w-full px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-semibold transition-colors">Przejdź do logowania</button>
        </div>
      ) : !isLinkComplete ? (
        <div className="p-3 text-sm text-amber-800 bg-amber-100 rounded-lg">Link jest niepełny. Otwórz go ponownie z wiadomości e-mail albo poproś o nowy.</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">Konto: <span className="font-semibold text-slate-800">{email}</span></p>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nowe hasło</label>
            <input type="password" required autoComplete="new-password" pattern="(?=.*[0-9]).{8,}" title="Hasło musi mieć co najmniej 8 znaków, w tym jedną cyfrę."
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
            <p className="mt-1 text-xs text-slate-500">Minimum 8 znaków, w tym co najmniej jedna cyfra.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Powtórz nowe hasło</label>
            <input type="password" required autoComplete="new-password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
          </div>
          <button type="submit" className="w-full px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-semibold transition-colors">Zmień hasło</button>
        </form>
      )}

      {!message && (
        <p className="text-sm text-center text-slate-600">
          Link wygasł? <button type="button" onClick={onRequestNewLink} className="text-emerald-600 hover:underline">Poproś o nowy</button>
        </p>
      )}
    </div>
  );
}