using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;
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
}