using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Interfaces;

namespace Services.Services;

public class AvailabilityService : IAvailabilityService
{
    private readonly ApplicationDbContext _context;

    public AvailabilityService(ApplicationDbContext context)
    {
        _context = context;
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