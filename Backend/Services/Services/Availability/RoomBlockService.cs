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
    private readonly INotificationService _notificationService;

    public RoomBlockService(ApplicationDbContext context, IAvailabilityService availabilityService, INotificationService notificationService)
    {
        _context = context;
        _availabilityService = availabilityService;
        _notificationService = notificationService;
    }

    // Każdy przeniesiony gość dostaje powiadomienie o nowym pokoju
    private async Task NotifyRelocatedGuestsAsync(List<RelocatedReservationDto> relocated)
    {
        foreach (var r in relocated)
        {
            await _notificationService.NotifyUserAsync(r.GuestId, $"Rezerwacja #{r.ReservationId} ({r.CheckInDate:dd.MM.yyyy} - {r.CheckOutDate:dd.MM.yyyy}) została przeniesiona z pokoju {r.FromRoomNumber} do pokoju {r.ToRoomNumber} tego samego typu. Termin i cena się nie zmieniają.", r.ReservationId);
        }
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

    public async Task<List<RelocatedReservationDto>> CreateRoomBlockAsync(RoomBlockDto dto)
    {
        if (dto.StartDate >= dto.EndDate)
        {
            throw new ArgumentException("Data rozpoczęcia blokady musi być wcześniejsza niż data zakończenia.");
        }

        if (string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new ArgumentException("Podaj powód blokady (np. remont, konserwacja).");
        }

        var room = await _context.Rooms.FindAsync(dto.RoomId);
        if (room == null)
        {
            throw new ArgumentException("Wskazany pokój nie istnieje!");
        }

        // Sprawdzenie kolizji, przeniesienie gości i zapis blokady w jednej transakcji - w tym czasie nikt nie zarezerwuje pokoi tego typu
        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _availabilityService.LockRoomTypeAsync(room.RoomTypeId);

        // Reguła kolizji terminów jest w module dostępności (AvailabilityService)
        var hasBlocks = await _availabilityService.HasBlocksAsync(dto.RoomId, dto.StartDate, dto.EndDate);

        if (hasBlocks)
        {
            throw new ArgumentException("Pokój jest już zablokowany w części tego terminu.");
        }

        // Rezerwacje w tym pokoju w okresie blokady przechodzą do innych wolnych pokoi tego samego typu
        var relocated = await _availabilityService.RelocateReservationsAsync(room.RoomId, room.RoomTypeId, dto.StartDate, dto.EndDate);

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
        await NotifyRelocatedGuestsAsync(relocated);

        await transaction.CommitAsync();
        return relocated;
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