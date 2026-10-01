// Plik: Frontend/src/components/RoomPhotoPlaceholder.tsx

// Zastępczy obrazek, gdy typ pokoju nie ma jeszcze zdjęć
export default function RoomPhotoPlaceholder() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-200 text-slate-400">
      <svg viewBox="0 0 24 24" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 18v2M21 18v2M6 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M12 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-sm font-medium">Brak zdjęcia</span>
    </div>
  );
}