// Plik: Frontend/src/components/ForgotPasswordForm.tsx
import { useState } from 'react';
import { forgotPassword } from '../api/authApi';
import { errorMessage } from '../api/apiErrors';
import Alert from './Alert';

// Reset hasła - krok 1: podanie adresu e-mail, na który zostanie wysłany link
export default function ForgotPasswordForm({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSending(true);
    try {
      setMessage(await forgotPassword(email));
    } catch (err) {
      setError(errorMessage(err));
    }
    setIsSending(false);
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-center text-slate-800">Nie pamiętasz hasła?</h2>

      {error && <Alert type="error" message={error} />}
      {message ? (
        <div className="space-y-4">
          <Alert type="success" message={message} />
          <p className="text-sm text-slate-600">Sprawdź skrzynkę (także folder SPAM) i kliknij link w wiadomości. Link jest ważny przez 2 godziny.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">Podaj adres e-mail konta. Wyślemy na niego link do ustawienia nowego hasła.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700">Adres e-mail</label>
            <input type="email" required maxLength={100} value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
          </div>
          <button type="submit" disabled={isSending} className="w-full px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-semibold transition-colors disabled:bg-slate-400">
            {isSending ? 'Wysyłanie...' : 'Wyślij link'}
          </button>
        </form>
      )}

      <p className="text-sm text-center text-slate-600">
        <button type="button" onClick={onBackToLogin} className="text-emerald-600 hover:underline">← Wróć do logowania</button>
      </p>
    </div>
  );
}