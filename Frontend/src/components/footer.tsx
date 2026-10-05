// Plik: Frontend/src/components/Footer.tsx

// Dane hotelu wyświetlane w stopce - jedno miejsce do podmiany
const hotelInfo = {
  name: 'Hotel Resort',
  street: 'ul. Słoneczna 12',
  city: '42-200 Częstochowa',
  phone: '+48 34 123 45 67',
  email: 'rezerwacje@hotel-resort.pl',
  checkIn: '14:00',
  checkOut: '11:00'
};

// Stopka widoczna na każdej stronie: kontakt, zasady pobytu i skróty zależne od roli
export default function Footer({ isLoggedIn, isOwner, onNavigate }: { isLoggedIn: boolean; isOwner: boolean; onNavigate: (path: string) => void }) {
  const link = 'text-left text-slate-600 hover:text-emerald-600 hover:underline';

  return (
    <footer className="w-full max-w-6xl mt-auto bg-white rounded-xl shadow-sm p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
        <div className="space-y-2">
          <div className="text-lg font-bold text-emerald-600">{hotelInfo.name}</div>
          <p className="text-slate-600">Komfortowe pokoje i apartamenty z rezerwacją online.</p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">Kontakt</h4>
          <address className="not-italic text-slate-600 space-y-1">
            <div>{hotelInfo.street}</div>
            <div>{hotelInfo.city}</div>
            <div><a href={`tel:${hotelInfo.phone.replace(/\s/g, '')}`} className="hover:text-emerald-600 hover:underline">{hotelInfo.phone}</a></div>
            <div><a href={`mailto:${hotelInfo.email}`} className="hover:text-emerald-600 hover:underline break-all">{hotelInfo.email}</a></div>
          </address>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">Pobyt</h4>
          <ul className="text-slate-600 space-y-1">
            <li>Zameldowanie od {hotelInfo.checkIn}</li>
            <li>Wymeldowanie do {hotelInfo.checkOut}</li>
            <li>Recepcja czynna całą dobę</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">Na skróty</h4>
          <ul className="space-y-1">
            <li><button type="button" onClick={() => onNavigate('/')} className={link}>Pokoje i wyszukiwarka</button></li>
            {!isLoggedIn && <li><button type="button" onClick={() => onNavigate('/logowanie')} className={link}>Logowanie i rejestracja</button></li>}
            {isLoggedIn && !isOwner && <li><button type="button" onClick={() => onNavigate('/moje-rezerwacje')} className={link}>Moje rezerwacje</button></li>}
            {isLoggedIn && isOwner && <li><button type="button" onClick={() => onNavigate('/panel')} className={link}>Panel Właściciela</button></li>}
            {isLoggedIn && <li><button type="button" onClick={() => onNavigate('/profil')} className={link}>Mój profil</button></li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
        © {new Date().getFullYear()} {hotelInfo.name} · System rezerwacji pokoi hotelowych - praca inżynierska
      </div>
    </footer>
  );
}