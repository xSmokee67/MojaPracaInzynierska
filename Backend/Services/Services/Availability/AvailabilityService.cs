using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;
using Services.DTO;
using Services.Interfaces;
using System.Linq.Expressions;

namespace Services.Services;

// Moduł zarządzania dostępnością. Pokój jest wolny w terminie, gdy:
// - ma status "available" (nie jest sprzątany, w remoncie ani wyłączony),
// - nie ma nieanulowanej rezerwacji nachodzącej na termin,
// - nie ma blokady nachodzącej na termin.
// Terminy to przedziały [początek, koniec) - dzień wymeldowania / koniec blokady jest już wolny dla kolejnego gościa.
public class AvailabilityService : IAvailabilityService
{
    // Najdłuższy zakres kalendarza w panelu (ok. dwa miesiące) - siatka pokoje × dni pozostaje czytelna
    private const int MaxCalendarDays = 62;

    private readonly ApplicationDbContext _context;

    public AvailabilityService(ApplicationDbContext context)
    {
        _context = context;
    }

    // Reguła kolizji terminów - jedna dla rezerwacji i blokad: A.początek < B.koniec i A.koniec > B.początek
    private static Expression<Func<Reservation, bool>> ActiveReservationOverlaps(DateTime startDate, DateTime endDate) =>
        r => r.Status != ReservationStatus.Cancelled && r.CheckInDate < endDate && r.CheckOutDate > startDate;

    private static Expression<Func<RoomBlock, bool>> BlockOverlaps(DateTime startDate, DateTime endDate) =>
        b => b.StartDate < endDate && b.EndDate > startDate;

    // Ta sama reguła zastosowana do jednej nocy [date, date + 1 dzień) - kalendarze sprawdzają noc po nocy
    private static bool CoversNight(Reservation r, DateTime date) => r.CheckInDate < date.AddDays(1) && r.CheckOutDate > date;

    private static bool CoversNight(RoomBlock b, DateTime date) => b.StartDate < date.AddDays(1) && b.EndDate > date;

    // Zakres kalendarza: od < do i najwyżej MaxCalendarDays nocy
    private static void ValidateCalendarRange(DateTime start, DateTime end)
    {
        if (start >= end)
        {
            throw new ArgumentException("Data początkowa musi być wcześniejsza niż data końcowa.");
        }

        if ((end - start).Days > MaxCalendarDays)
        {
            throw new ArgumentException($"Kalendarz można wyświetlić maksymalnie dla {MaxCalendarDays} dni.");
        }
    }

    public async Task<List<int>> GetAvailableRoomIdsAsync(int roomTypeId, DateTime checkIn, DateTime checkOut, int? excludedReservationId = null)
    {
        var reservations = _context.Reservations.AsQueryable();

        // Przy zmianie terminu pomijamy zmienianą rezerwację - jej obecne noce nie zajmują pokoju dla nowego terminu
        if (excludedReservationId != null)
        {
            reservations = reservations.Where(r => r.ReservationId != excludedReservationId);
        }

        // Pokoje zajęte lub zablokowane w terminie - jako podzapytania (jedno zapytanie SQL z NOT IN / NOT EXISTS)
        var reservedRoomIds = reservations.Where(ActiveReservationOverlaps(checkIn, checkOut)).Select(r => r.RoomId);
        var blockedRoomIds = _context.RoomBlocks.Where(BlockOverlaps(checkIn, checkOut)).Select(b => b.RoomId);

        return await _context.Rooms
            .Where(r => r.RoomTypeId == roomTypeId && r.Status == RoomStatus.Available)
            .Where(r => !reservedRoomIds.Contains(r.RoomId) && !blockedRoomIds.Contains(r.RoomId))
            .OrderBy(r => r.RoomId)
            .Select(r => r.RoomId)
            .ToListAsync();
    }

    public async Task<int?> GetAvailableRoomIdAsync(int roomTypeId, DateTime checkIn, DateTime checkOut)
    {
        var roomIds = await GetAvailableRoomIdsAsync(roomTypeId, checkIn, checkOut);
        return roomIds.Count > 0 ? roomIds[0] : null;
    }

    public async Task<bool> HasBlocksAsync(int roomId, DateTime startDate, DateTime endDate)
    {
        return await _context.RoomBlocks
            .Where(b => b.RoomId == roomId)
            .AnyAsync(BlockOverlaps(startDate, endDate));
    }

    // Blokada pesymistyczna (SQL Server): SELECT z UPDLOCK zakłada na wiersze pokoi danego typu blokadę aktualizacji,
    // która trwa do końca transakcji. Drugie równoczesne żądanie dla tych pokoi (rezerwacja, zmiana terminu, blokada,
    // remont pokoju) czeka przy tym zapytaniu, aż pierwsze się zakończy, i dopiero potem sprawdza dostępność - na aktualnych danych.
    public async Task LockRoomTypeAsync(int roomTypeId)
    {
        // Baza w pamięci (testy jednostkowe) nie wykonuje SQL i nie ma blokad wierszy
        if (!_context.Database.IsRelational())
        {
            return;
        }

        await _context.Database.ExecuteSqlAsync($"SELECT RoomId FROM Rooms WITH (UPDLOCK) WHERE RoomTypeId = {roomTypeId}");
    }

    // Wywoływane w transakcji (po LockRoomTypeAsync) przez remont / wyłączenie pokoju, zmianę jego typu i założenie blokady.
    // Każda rezerwacja (oczekująca lub potwierdzona) trafia do innego pokoju tego typu wolnego przez cały jej pobyt;
    // jeśli choć jednej nie da się przenieść, rzucany jest wyjątek, a transakcja wycofuje wszystkie przeniesienia.
    public async Task<List<RelocatedReservationDto>> RelocateReservationsAsync(int roomId, int roomTypeId, DateTime from, DateTime? to)
    {
        var reservations = await _context.Reservations
            .Where(r => r.RoomId == roomId)
            .Where(r => r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Confirmed)
            .Where(r => r.CheckOutDate > from && (to == null || r.CheckInDate < to))
            .OrderBy(r => r.CheckInDate)
            .ToListAsync();

        // Gość, który już mieszka w pokoju, nie jest przenoszony automatycznie
        var ongoing = reservations.FirstOrDefault(r => r.CheckInDate.Date < DateTime.Today);
        if (ongoing != null)
        {
            throw new ArgumentException($"W pokoju trwa pobyt (rezerwacja #{ongoing.ReservationId} do {ongoing.CheckOutDate:dd.MM.yyyy}). Zmiana jest możliwa po wymeldowaniu gościa.");
        }

        var roomNumbers = await _context.Rooms
            .Where(r => r.RoomTypeId == roomTypeId || r.RoomId == roomId)
            .ToDictionaryAsync(r => r.RoomId, r => r.RoomNumber);

        var relocated = new List<RelocatedReservationDto>();
        var notRelocated = new List<string>();

        foreach (var reservation in reservations)
        {
            // Wolne pokoje tego typu na cały pobyt - bez pokoju, który jest wycofywany
            var freeRoomIds = await GetAvailableRoomIdsAsync(roomTypeId, reservation.CheckInDate, reservation.CheckOutDate, reservation.ReservationId);
            var newRoomId = freeRoomIds.Where(id => id != roomId).Cast<int?>().FirstOrDefault();

            if (newRoomId == null)
            {
                notRelocated.Add($"#{reservation.ReservationId} ({reservation.CheckInDate:dd.MM.yyyy} - {reservation.CheckOutDate:dd.MM.yyyy})");
                continue;
            }

            await UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, AvailabilityStatus.Free);
            reservation.RoomId = newRoomId.Value;
            await _context.SaveChangesAsync();
            await UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, AvailabilityStatus.Booked);

            relocated.Add(new RelocatedReservationDto
            {
                ReservationId = reservation.ReservationId,
                GuestId = reservation.GuestId,
                CheckInDate = reservation.CheckInDate,
                CheckOutDate = reservation.CheckOutDate,
                FromRoomNumber = roomNumbers[roomId],
                ToRoomNumber = roomNumbers[newRoomId.Value]
            });
        }

        if (notRelocated.Count > 0)
        {
            throw new ArgumentException($"Brak wolnego pokoju tego typu dla rezerwacji: {string.Join(", ", notRelocated)}. Zmień ich termin albo je anuluj i spróbuj ponownie.");
        }

        return relocated;
    }

    // Ustawia status (free / booked / blocked) dla każdej nocy z zakresu [startDate, endDate)
    // - tak samo jak przy rezerwacji: dzień wymeldowania / koniec blokady jest już wolny.
    public async Task UpdateAvailabilityAsync(int roomId, DateTime startDate, DateTime endDate, string status)
    {
        var start = startDate.Date;
        var end = endDate.Date;

        var existingEntries = await _context.Availabilities
            .Where(a => a.RoomId == roomId && a.Date >= start && a.Date < end)
            .ToListAsync();

        for (var date = start; date < end; date = date.AddDays(1))
        {
            var entry = existingEntries.FirstOrDefault(a => a.Date.Date == date);

            if (entry == null)
            {
                _context.Availabilities.Add(new Availability
                {
                    RoomId = roomId,
                    Date = date,
                    Status = status
                });
            }
            else
            {
                entry.Status = status;
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task<List<RoomAvailabilityDto>> GetCalendarAsync(DateTime from, DateTime to)
    {
        var start = from.Date;
        var end = to.Date;
        ValidateCalendarRange(start, end);

        var rooms = await _context.Rooms
            .Include(r => r.RoomType)
            .OrderBy(r => r.RoomNumber)
            .ToListAsync();

        // Rezerwacje i blokady nachodzące na zakres - ta sama reguła kolizji co przy wyszukiwaniu wolnych pokoi
        var reservations = await _context.Reservations
            .Include(r => r.Guest)
            .Where(ActiveReservationOverlaps(start, end))
            .ToListAsync();

        var blocks = await _context.RoomBlocks
            .Where(BlockOverlaps(start, end))
            .ToListAsync();

        var calendar = new List<RoomAvailabilityDto>();

        foreach (var room in rooms)
        {
            var row = new RoomAvailabilityDto
            {
                RoomId = room.RoomId,
                RoomNumber = room.RoomNumber,
                RoomTypeName = room.RoomType.Name,
                RoomStatus = room.Status
            };

            for (var date = start; date < end; date = date.AddDays(1))
            {
                // Noc jest zajęta, gdy nachodzi na nią rezerwacja albo blokada
                var reservation = reservations.FirstOrDefault(r => r.RoomId == room.RoomId && CoversNight(r, date));
                var block = blocks.FirstOrDefault(b => b.RoomId == room.RoomId && CoversNight(b, date));

                var day = new AvailabilityDayDto { Date = date, Status = AvailabilityStatus.Free };

                if (reservation != null)
                {
                    day.Status = AvailabilityStatus.Booked;
                    day.ReservationId = reservation.ReservationId;
                    day.ReservationStatus = reservation.Status;
                    day.GuestName = reservation.Guest.FirstName + " " + reservation.Guest.LastName;
                }
                else if (block != null)
                {
                    day.Status = AvailabilityStatus.Blocked;
                    day.BlockReason = block.Reason;
                }

                row.Days.Add(day);
            }

            calendar.Add(row);
        }

        return calendar;
    }

    // Liczba wolnych pokoi liczona noc po nocy. Wolna każda noc nie oznacza jeszcze, że jeden pokój jest wolny przez cały pobyt
    // (gość musiałby zmieniać pokoje) - dlatego wybrany w kalendarzu termin jest na końcu sprawdzany tak jak każda rezerwacja.
    public async Task<List<RoomTypeNightDto>?> GetRoomTypeCalendarAsync(int roomTypeId, DateTime from, DateTime to)
    {
        var start = from.Date;
        var end = to.Date;
        ValidateCalendarRange(start, end);

        var roomTypeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == roomTypeId);
        if (!roomTypeExists)
        {
            return null;
        }

        // Tylko pokoje, które można rezerwować (status "available") - tak samo jak przy wyszukiwaniu wolnych pokoi
        var roomIds = await _context.Rooms
            .Where(r => r.RoomTypeId == roomTypeId && r.Status == RoomStatus.Available)
            .Select(r => r.RoomId)
            .ToListAsync();

        var reservations = await _context.Reservations
            .Where(r => roomIds.Contains(r.RoomId))
            .Where(ActiveReservationOverlaps(start, end))
            .ToListAsync();

        var blocks = await _context.RoomBlocks
            .Where(b => roomIds.Contains(b.RoomId))
            .Where(BlockOverlaps(start, end))
            .ToListAsync();

        var nights = new List<RoomTypeNightDto>();

        for (var date = start; date < end; date = date.AddDays(1))
        {
            var occupiedRooms = reservations.Where(r => CoversNight(r, date)).Select(r => r.RoomId)
                .Concat(blocks.Where(b => CoversNight(b, date)).Select(b => b.RoomId))
                .Distinct()
                .Count();

            nights.Add(new RoomTypeNightDto { Date = date, AvailableRooms = roomIds.Count - occupiedRooms });
        }

        return nights;
    }
}