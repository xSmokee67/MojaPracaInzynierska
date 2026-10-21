using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class RoomBlockService : IRoomBlockService
{
    private readonly ApplicationDbContext _context;
    private readonly IAvailabilityService _availabilityService;

    public RoomBlockService(ApplicationDbContext context, IAvailabilityService availabilityService)
    {
        _context = context;
        _availabilityService = availabilityService;
    }

    public async Task<List<RoomBlockDto>> GetAllRoomBlocksAsync(int? roomId)
    {
        return await _context.RoomBlocks
            .Include(b => b.Room)
            .Include(b => b.Owner)
            .Where(b => roomId == null || b.RoomId == roomId)
            .OrderBy(b => b.StartDate)
            .Select(b => new RoomBlockDto
            {
                RoomBlockId = b.RoomBlockId,
                RoomId = b.RoomId,
                RoomNumber = b.Room.RoomNumber,
                OwnerId = b.OwnerId,
                OwnerName = b.Owner.FirstName + " " + b.Owner.LastName,
                StartDate = b.StartDate,
                EndDate = b.EndDate,
                Reason = b.Reason
            }).ToListAsync();
    }

    public async Task CreateRoomBlockAsync(RoomBlockDto dto)
    {
        if (dto.StartDate >= dto.EndDate)
        {
            throw new ArgumentException("Data rozpoczęcia blokady musi być wcześniejsza niż data zakończenia.");
        }

        if (string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new ArgumentException("Podaj powód blokady (np. remont, konserwacja).");
        }

        var roomExists = await _context.Rooms.AnyAsync(r => r.RoomId == dto.RoomId);
        if (!roomExists)
        {
            throw new ArgumentException("Wskazany pokój nie istnieje!");
        }

        // Sprawdzenie kolizji i zapis blokady w jednej transakcji - w tym czasie nikt nie zarezerwuje tego pokoju
        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _availabilityService.LockRoomAsync(dto.RoomId);

        // Reguła kolizji terminów jest w module dostępności (AvailabilityService)
        var hasReservations = await _availabilityService.HasActiveReservationsAsync(dto.RoomId, dto.StartDate, dto.EndDate);

        if (hasReservations)
        {
            throw new ArgumentException("W tym terminie pokój ma aktywne rezerwacje. Najpierw je anuluj lub wybierz inny termin.");
        }

        var hasBlocks = await _availabilityService.HasBlocksAsync(dto.RoomId, dto.StartDate, dto.EndDate);

        if (hasBlocks)
        {
            throw new ArgumentException("Pokój jest już zablokowany w części tego terminu.");
        }

        var block = new RoomBlock
        {
            RoomId = dto.RoomId,
            OwnerId = dto.OwnerId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Reason = dto.Reason
        };

        _context.RoomBlocks.Add(block);
        await _context.SaveChangesAsync();

        await _availabilityService.UpdateAvailabilityAsync(block.RoomId, block.StartDate, block.EndDate, AvailabilityStatus.Blocked);

        await transaction.CommitAsync();
    }

    public async Task<bool> DeleteRoomBlockAsync(int roomBlockId)
    {
        var block = await _context.RoomBlocks.FindAsync(roomBlockId);
        if (block == null)
        {
            return false;
        }

        _context.RoomBlocks.Remove(block);
        await _context.SaveChangesAsync();

        await _availabilityService.UpdateAvailabilityAsync(block.RoomId, block.StartDate, block.EndDate, AvailabilityStatus.Free);

        return true;
    }
}