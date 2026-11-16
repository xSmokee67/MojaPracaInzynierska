// Plik: Frontend/src/components/common/Alert.jsx

// Komunikat nad formularzem lub tabelą: błąd (czerwony) albo potwierdzenie wykonanej operacji (zielony)
export default function Alert({ type, message }) {
  const colors = type === 'error' ? 'bg-danger-50 text-danger-700 border-danger-200' : 'bg-success-50 text-success-700 border-success-200';
  return <div role={type === 'error' ? 'alert' : 'status'} className={`px-4 py-3 rounded-xl border text-sm font-medium ${colors}`}>{message}</div>;
}