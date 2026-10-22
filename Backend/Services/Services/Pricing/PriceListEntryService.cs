using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class PriceListEntryService : IPriceListEntryService
{
    private readonly ApplicationDbContext _context;

    public PriceListEntryService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PriceListEntryDto>> GetAllPriceListEntriesAsync()
    {
        return await _context.PriceListEntries.Include(p => p.RoomType).Select(p => new PriceListEntryDto
        {
            PriceListEntryId = p.PriceListEntryId,
            RoomTypeId = p.RoomTypeId,
            RoomTypeName = p.RoomType.Name,
            StartDate = p.StartDate,
            EndDate = p.EndDate,
            PricePerNight = p.PricePerNight
        }).ToListAsync();
    }

    public async Task CreatePriceListEntryAsync(PriceListEntryDto dto)
    {
        await ValidatePriceListEntryAsync(dto, null);

        var entry = new PriceListEntry
        {
            RoomTypeId = dto.RoomTypeId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            PricePerNight = dto.PricePerNight
        };

        _context.PriceListEntries.Add(entry);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> UpdatePriceListEntryAsync(int priceListEntryId, PriceListEntryDto dto)
    {
        var entry = await _context.PriceListEntries.FindAsync(priceListEntryId);
        if (entry == null)
        {
            return false;
        }

        await ValidatePriceListEntryAsync(dto, priceListEntryId);

        entry.RoomTypeId = dto.RoomTypeId;
        entry.StartDate = dto.StartDate;
        entry.EndDate = dto.EndDate;
        entry.PricePerNight = dto.PricePerNight;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeletePriceListEntryAsync(int priceListEntryId)
    {
        var entry = await _context.PriceListEntries.FindAsync(priceListEntryId);
        if (entry == null)
        {
            return false;
        }

        _context.PriceListEntries.Remove(entry);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task ValidatePriceListEntryAsync(PriceListEntryDto dto, int? excludedId)
    {
        if (dto.StartDate >= dto.EndDate)
        {
            throw new ArgumentException("Data rozpoczęcia musi być wcześniejsza niż data zakończenia.");
        }

        var typeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == dto.RoomTypeId);
        if (!typeExists)
        {
            throw new ArgumentException("Wskazany typ pokoju nie istnieje!");
        }

        if (dto.PricePerNight <= 0)
        {
            throw new ArgumentException("Cena za noc musi być większa od zera.");
        }

        if (await HasOverlappingEntryAsync(dto, excludedId))
        {
            throw new ArgumentException("Okres nakłada się na istniejący wpis cennika dla tego typu pokoju.");
        }
    }

    // Okresy liczone włącznie z obiema datami - tak samo jak przy wyliczaniu ceny w ReservationService
    private async Task<bool> HasOverlappingEntryAsync(PriceListEntryDto dto, int? excludedId)
    {
        return await _context.PriceListEntries.AnyAsync(p =>
            p.RoomTypeId == dto.RoomTypeId &&
            (excludedId == null || p.PriceListEntryId != excludedId) &&
            p.StartDate <= dto.EndDate &&
            p.EndDate >= dto.StartDate);
    }
}