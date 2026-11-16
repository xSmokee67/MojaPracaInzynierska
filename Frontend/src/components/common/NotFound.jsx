// Plik: Frontend/src/components/common/NotFound.jsx

// Strona błędu: nieznany adres (#/cos-tam) albo nieistniejący pokój (#/pokoj/999)
export default function NotFound({ title = 'Nie znaleziono strony', message = 'Adres jest nieprawidłowy albo strona została usunięta.', showCode = true, onHome }) {
  return (
    <div className="w-full max-w-lg py-12 md:py-20 space-y-5 text-center">
      {showCode && <div className="text-8xl font-display font-medium text-brass-500">404</div>}
      <h2 className="text-3xl md:text-4xl font-medium">{title}</h2>
      <p className="text-slate-600">{message}</p>
      <button type="button" onClick={onHome} className="btn-primary">Wróć na stronę główną</button>
    </div>
  );
}