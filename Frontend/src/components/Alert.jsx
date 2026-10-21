// Plik: Frontend/src/components/Alert.jsx

// Komunikat nad formularzem lub tabelą: błąd (czerwony) albo potwierdzenie wykonanej operacji (zielony)
export default function Alert({ type, message }) {
  const colors = type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
  return <div className={`p-3 rounded-lg text-sm font-medium ${colors}`}>{message}</div>;
}