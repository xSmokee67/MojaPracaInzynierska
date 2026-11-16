// Plik: Frontend/src/components/common/Footer.jsx
import { hotelInfo } from '../../utils/hotelInfo';

// Stopka widoczna na każdej stronie: nazwa i adres hotelu, kontakt oraz godziny zameldowania
export default function Footer() {
  const link = 'hover:text-brass-700 hover:underline';

  return (
    <footer className="mt-auto bg-sand-100 text-sm text-slate-600">
      <div className="max-w-page mx-auto px-4 md:px-6 py-8 flex flex-wrap justify-between gap-x-10 gap-y-4">
        <div>
          <div className="text-lg font-display font-medium text-navy-900">{hotelInfo.name}</div>
          <div>{hotelInfo.street}, {hotelInfo.city}</div>
        </div>

        <div className="flex flex-col">
          <a href={`tel:${hotelInfo.phone.replace(/\s/g, '')}`} className={`font-medium text-navy-900 ${link}`}>{hotelInfo.phone}</a>
          <a href={`mailto:${hotelInfo.email}`} className={`break-all ${link}`}>{hotelInfo.email}</a>
        </div>

        <div>
          Zameldowanie od <span className="font-medium text-navy-900">{hotelInfo.checkIn}</span>
          <br />
          Wymeldowanie do <span className="font-medium text-navy-900">{hotelInfo.checkOut}</span>
        </div>
      </div>

      <div className="border-t border-sand-300">
        <div className="max-w-page mx-auto px-4 md:px-6 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} {hotelInfo.name} · praca inżynierska
        </div>
      </div>
    </footer>
  );
}
