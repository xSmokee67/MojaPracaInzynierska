// Plik: Frontend/src/components/common/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../api/notificationApi';
import { formatDateTime } from '../../utils/format';

// Co ile odświeżać listę (ms) - zwykłe zapytanie co minutę zamiast połączenia "na żywo"
const REFRESH_INTERVAL = 60000;

// Dzwonek w pasku nawigacji: liczba nieprzeczytanych powiadomień i lista zmian w rezerwacjach.
// refreshKey - zmiana adresu (przejście na inną stronę) odświeża listę od razu
export default function NotificationBell({ token, refreshKey, onOpenReservation }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setNotifications(await getNotifications(token));
      } catch {
        // Błąd odświeżania nie przerywa pracy - lista spróbuje się odświeżyć przy następnej okazji
      }
    };
    loadData();
    const timer = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [token, refreshKey, reloadKey]);

  // Kliknięcie poza listą zamyka ją
  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Lista ma 20rem szerokości: przy dzwonku blisko lewej krawędzi (wąski ekran) rozwija się w prawo, w pozostałych przypadkach w lewo
  const handleToggle = () => {
    if (!isOpen) setAlignLeft(panelRef.current.getBoundingClientRect().right < 336);
    setIsOpen(open => !open);
  };

  // Kliknięcie powiadomienia: oznaczenie jako przeczytane i przejście do rezerwacji
  const handleOpen = async (notification) => {
    setIsOpen(false);
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.notificationId, token);
      } catch {
        // Nieudane oznaczenie nie blokuje przejścia do rezerwacji
      }
      setReloadKey(key => key + 1);
    }
    if (notification.reservationId) onOpenReservation(notification.reservationId);
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead(token);
    } catch {
      // Lista odświeży się i tak - nieprzeczytane zostaną oznaczone przy kolejnej próbie
    }
    setReloadKey(key => key + 1);
  };

  return (
    <div ref={panelRef} className="relative">
      <button type="button" onClick={handleToggle} aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `Powiadomienia, nowe: ${unreadCount}` : 'Powiadomienia'}
        className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isOpen ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-100 hover:bg-white/20'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brass-400 text-navy-950 text-xs font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${alignLeft ? 'left-0' : 'right-0'} mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white text-slate-800 rounded-xl shadow-xl ring-1 ring-slate-200 z-40 overflow-hidden`}>
          <div className="flex justify-between items-center gap-2 px-4 py-3 border-b border-slate-200">
            <span className="font-semibold">Powiadomienia</span>
            {unreadCount > 0 && <button type="button" onClick={handleReadAll} className="text-xs font-semibold text-emerald-600 hover:underline whitespace-nowrap">Oznacz jako przeczytane</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.map(n => (
              <li key={n.notificationId}>
                <button type="button" onClick={() => handleOpen(n)} className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 ${n.isRead ? 'text-slate-500' : 'text-slate-800 bg-emerald-50/60'}`}>
                  <div className="flex gap-2">
                    {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-label="nowe" />}
                    <span>{n.message}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</div>
                </button>
              </li>
            ))}
            {notifications.length === 0 && <li className="px-4 py-6 text-sm text-slate-500 text-center">Brak powiadomień. Pojawią się tu zmiany w rezerwacjach.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}