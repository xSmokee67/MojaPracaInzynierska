// Plik: Frontend/src/components/common/StarRating.jsx

// Ocena w skali 1-5 jako gwiazdki, np. ★★★★☆ (średnia ocena jest zaokrąglana do pełnych gwiazdek)
export default function StarRating({ rating }) {
  const stars = Math.round(rating);
  return <span className="text-amber-500 whitespace-nowrap">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>;
}