// Plik: Frontend/src/components/common/Footer.jsx
import { hotelInfo } from '../../utils/hotelInfo';

// Stopka widoczna na każdej stronie: kontakt, zasady pobytu i skróty zależne od roli
export default function Footer({ isLoggedIn, isOwner, onNavigate }) {
  const link = 'text-left text-slate-600 hover:text-brass-700 hover:underline';

  return (
    <footer className="mt-auto bg-sand-100 text-slate-600">
      <div className="max-w-page mx-auto px-4 md:px-6 py-10 md:py-12 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div className="space-y-2">
            <div className="text-xl font-display font-medium text-navy-900">{hotelInfo.name}</div>
            <p>Komfortowe pokoje i apartamenty z rezerwacją online.</p>
          </div>

          <div className="space-y-2">
            <h4 className="eyebrow">Kontakt</h4>
            <address className="not-italic space-y-1">
              <div>{hotelInfo.street}</div>
              <div>{hotelInfo.city}</div>
              <div><a href={`tel:${hotelInfo.phone.replace(/\s/g, '')}`} className="text-navy-900 font-medium hover:text-brass-700 hover:underline">{hotelInfo.phone}</a></div>
              <div><a href={`mailto:${hotelInfo.email}`} className="hover:text-brass-700 hover:underline break-all">{hotelInfo.email}</a></div>
            </address>
          </div>

          <div className="space-y-2">
            <h4 className="eyebrow">Pobyt</h4>
            <ul className="space-y-1">
              <li>Zameldowanie od <span className="font-medium text-navy-900">{hotelInfo.checkIn}</span></li>
              <li>Wymeldowanie do <span className="font-medium text-navy-900">{hotelInfo.checkOut}</span></li>
              <li>Recepcja czynna całą dobę</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="eyebrow">Na skróty</h4>
            <ul className="space-y-1">
              <li><button type="button" onClick={() => onNavigate('/')} className={link}>Pokoje i wyszukiwarka</button></li>
              {!isLoggedIn && <li><button type="button" onClick={() => onNavigate('/logowanie')} className={link}>Logowanie i rejestracja</button></li>}
              {isLoggedIn && !isOwner && <li><button type="button" onClick={() => onNavigate('/moje-rezerwacje')} className={link}>Moje rezerwacje</button></li>}
              {isLoggedIn && isOwner && <li><button type="button" onClick={() => onNavigate('/panel')} className={link}>Panel właściciela</button></li>}
              {isLoggedIn && <li><button type="button" onClick={() => onNavigate('/profil')} className={link}>Mój profil</button></li>}
            </ul>
          </div>
        </div>

        <div className="border-t border-sand-300 pt-5 text-xs text-slate-500">
          © {new Date().getFullYear()} {hotelInfo.name} · System rezerwacji pokoi hotelowych - praca inżynierska
        </div>
      </div>
    </footer>
  );
}
