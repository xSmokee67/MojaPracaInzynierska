// Plik: Frontend/src/components/common/Footer.jsx

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
export default function Footer({ isLoggedIn, isOwner, onNavigate }) {
  const link = 'text-left text-slate-300 hover:text-brass-300 hover:underline';

  return (
    <footer className="w-full max-w-6xl mt-auto bg-navy-900 text-slate-300 rounded-xl shadow-lg p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
        <div className="space-y-2">
          <div className="text-lg font-display font-semibold text-brass-400">{hotelInfo.name}</div>
          <p>Komfortowe pokoje i apartamenty z rezerwacją online.</p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white">Kontakt</h4>
          <address className="not-italic space-y-1">
            <div>{hotelInfo.street}</div>
            <div>{hotelInfo.city}</div>
            <div><a href={`tel:${hotelInfo.phone.replace(/\s/g, '')}`} className="hover:text-brass-300 hover:underline">{hotelInfo.phone}</a></div>
            <div><a href={`mailto:${hotelInfo.email}`} className="hover:text-brass-300 hover:underline break-all">{hotelInfo.email}</a></div>
          </address>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white">Pobyt</h4>
          <ul className="space-y-1">
            <li>Zameldowanie od {hotelInfo.checkIn}</li>
            <li>Wymeldowanie do {hotelInfo.checkOut}</li>
            <li>Recepcja czynna całą dobę</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white">Na skróty</h4>
          <ul className="space-y-1">
            <li><button type="button" onClick={() => onNavigate('/')} className={link}>Pokoje i wyszukiwarka</button></li>
            {!isLoggedIn && <li><button type="button" onClick={() => onNavigate('/logowanie')} className={link}>Logowanie i rejestracja</button></li>}
            {isLoggedIn && !isOwner && <li><button type="button" onClick={() => onNavigate('/moje-rezerwacje')} className={link}>Moje rezerwacje</button></li>}
            {isLoggedIn && isOwner && <li><button type="button" onClick={() => onNavigate('/panel')} className={link}>Panel Właściciela</button></li>}
            {isLoggedIn && <li><button type="button" onClick={() => onNavigate('/profil')} className={link}>Mój profil</button></li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 text-xs text-slate-400">
        © {new Date().getFullYear()} {hotelInfo.name} · System rezerwacji pokoi hotelowych - praca inżynierska
      </div>
    </footer>
  );
}