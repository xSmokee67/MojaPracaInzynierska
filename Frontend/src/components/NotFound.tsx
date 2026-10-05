// Plik: Frontend/src/components/NotFound.tsx

// Strona błędu: nieznany adres (#/cos-tam) albo nieistniejący pokój (#/pokoj/999)
export default function NotFound({ title = 'Nie znaleziono strony', message = 'Adres jest nieprawidłowy albo strona została usunięta.', showCode = true, onHome }: { title?: string; message?: string; showCode?: boolean; onHome: () => void }) {
  return (
    <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-xl shadow-lg text-center">
      {showCode && <div className="text-6xl font-bold text-emerald-600">404</div>}
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      <p className="text-slate-600">{message}</p>
      <button type="button" onClick={onHome} className="w-full px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-semibold transition-colors">Wróć na stronę główną</button>
    </div>
  );
}