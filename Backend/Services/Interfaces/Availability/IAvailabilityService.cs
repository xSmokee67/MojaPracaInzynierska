using Services.DTO;

namespace Services.Interfaces;

// Moduł zarządzania dostępnością - jedno miejsce, które decyduje, czy pokój jest wolny w danym terminie
public interface IAvailabilityService
{
    // Wszystkie wolne pokoje danego typu w terminie [checkIn, checkOut) - bez rezerwacji, blokad i wyłączonych pokoi.
    // excludedReservationId - przy zmianie terminu rezerwacja nie blokuje sama siebie
    Task<List<int>> GetAvailableRoomIdsAsync(int roomTypeId, DateTime checkIn, DateTime checkOut, int? excludedReservationId = null);

    // Przydział pokoju do rezerwacji: pierwszy wolny pokój danego typu albo null, gdy brak miejsc
    Task<int?> GetAvailableRoomIdAsync(int roomTypeId, DateTime checkIn, DateTime checkOut);

    // Czy pokój ma w terminie blokadę (remont, konserwacja)
    Task<bool> HasBlocksAsync(int roomId, DateTime startDate, DateTime endDate);

    // Ochrona przed równoczesnym zajęciem pokoju - wywoływane na początku transakcji, blokada pokoi danego typu trwa do jej końca
    Task LockRoomTypeAsync(int roomTypeId);

    // Przeniesienie rezerwacji z pokoju, który przestaje być dostępny w zakresie [from, to) (to = null - bez końca),
    // do innych wolnych pokoi tego samego typu. Gdy dla którejś rezerwacji nie ma miejsca - ArgumentException.
    Task<List<RelocatedReservationDto>> RelocateReservationsAsync(int roomId, int roomTypeId, DateTime from, DateTime? to);

    // Najbliższe terminy tej samej długości z wolnym pokojem danego typu (najwyżej count, posortowane według daty przyjazdu)
    Task<List<AlternativeStayDto>> FindAlternativeStaysAsync(int roomTypeId, DateTime checkIn, DateTime checkOut, int count);

    // Kalendarz dostępności: status (free / booked / blocked) dla każdej nocy z zakresu
    Task UpdateAvailabilityAsync(int roomId, DateTime startDate, DateTime endDate, string status);

    // Kalendarz w panelu właściciela: każdy pokój i każda noc z zakresu [from, to) - wolna, zarezerwowana lub zablokowana
    Task<List<RoomAvailabilityDto>> GetCalendarAsync(DateTime from, DateTime to);

    // Kalendarz typu pokoju dla gościa: liczba wolnych pokoi w każdej nocy z zakresu [from, to); null, gdy typ nie istnieje
    Task<List<RoomTypeNightDto>?> GetRoomTypeCalendarAsync(int roomTypeId, DateTime from, DateTime to);
}