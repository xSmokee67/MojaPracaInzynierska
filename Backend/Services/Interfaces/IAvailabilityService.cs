using Services.DTO;

namespace Services.Interfaces;

// Moduł zarządzania dostępnością - jedno miejsce, które decyduje, czy pokój jest wolny w danym terminie
public interface IAvailabilityService
{
    // Wszystkie wolne pokoje danego typu w terminie [checkIn, checkOut) - bez rezerwacji, blokad i wyłączonych pokoi
    Task<List<int>> GetAvailableRoomIdsAsync(int roomTypeId, DateTime checkIn, DateTime checkOut);

    // Przydział pokoju do rezerwacji: pierwszy wolny pokój danego typu albo null, gdy brak miejsc
    Task<int?> GetAvailableRoomIdAsync(int roomTypeId, DateTime checkIn, DateTime checkOut);

    // Czy pokój ma w terminie nieanulowaną rezerwację (np. przed założeniem blokady)
    Task<bool> HasActiveReservationsAsync(int roomId, DateTime startDate, DateTime endDate);

    // Czy pokój ma w terminie blokadę (remont, konserwacja)
    Task<bool> HasBlocksAsync(int roomId, DateTime startDate, DateTime endDate);

    // Ochrona przed równoczesnym zajęciem pokoju - wywoływane na początku transakcji, blokada trwa do jej końca:
    // pokoje danego typu (przed przydziałem pokoju do rezerwacji) albo jeden pokój (przed założeniem blokady)
    Task LockRoomTypeAsync(int roomTypeId);
    Task LockRoomAsync(int roomId);

    // Kalendarz dostępności: status (free / booked / blocked) dla każdej nocy z zakresu
    Task UpdateAvailabilityAsync(int roomId, DateTime startDate, DateTime endDate, string status);

    // Kalendarz w panelu właściciela: każdy pokój i każda noc z zakresu [from, to) - wolna, zarezerwowana lub zablokowana
    Task<List<RoomAvailabilityDto>> GetCalendarAsync(DateTime from, DateTime to);
}