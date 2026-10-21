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

    public async Task<List<int>> GetAvailableRoomIdsAsync(int roomTypeId, DateTime checkIn, DateTime checkOut)
    {
        // Pokoje zajęte lub zablokowane w terminie - jako podzapytania (jedno zapytanie SQL z NOT IN / NOT EXISTS)
        var reservedRoomIds = _context.Reservations.Where(ActiveReservationOverlaps(checkIn, checkOut)).Select(r => r.RoomId);
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

    public async Task<bool> HasActiveReservationsAsync(int roomId, DateTime startDate, DateTime endDate)
    {
        return await _context.Reservations
            .Where(r => r.RoomId == roomId)
            .AnyAsync(ActiveReservationOverlaps(startDate, endDate));
    }

    public async Task<bool> HasBlocksAsync(int roomId, DateTime startDate, DateTime endDate)
    {
        return await _context.RoomBlocks
            .Where(b => b.RoomId == roomId)
            .AnyAsync(BlockOverlaps(startDate, endDate));
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

        if (start >= end)
        {
            throw new ArgumentException("Data początkowa musi być wcześniejsza niż data końcowa.");
        }

        if ((end - start).Days > MaxCalendarDays)
        {
            throw new ArgumentException($"Kalendarz można wyświetlić maksymalnie dla {MaxCalendarDays} dni.");
        }

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
                // Noc [date, nextDay) jest zajęta, gdy nachodzi na nią rezerwacja albo blokada
                var nextDay = date.AddDays(1);
                var reservation = reservations.FirstOrDefault(r => r.RoomId == room.RoomId && r.CheckInDate < nextDay && r.CheckOutDate > date);
                var block = blocks.FirstOrDefault(b => b.RoomId == room.RoomId && b.StartDate < nextDay && b.EndDate > date);

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
}