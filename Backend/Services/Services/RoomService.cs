using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class RoomService : IRoomService
{
    private readonly ApplicationDbContext _context;

    public RoomService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<RoomDto>> GetAllRoomsAsync()
    {
        return await _context.Rooms.Include(r => r.RoomType).Include(r => r.Amenities).Select(r => new RoomDto
        {
            RoomId = r.RoomId,
            RoomTypeId = r.RoomTypeId,
            RoomTypeName = r.RoomType.Name,
            RoomNumber = r.RoomNumber,
            Status = r.Status,
            AmenityIds = r.Amenities.Select(a => a.AmenityId).ToList(),
            AmenityNames = r.Amenities.Select(a => a.Name).ToList()
        }).ToListAsync();
    }

    public async Task CreateRoomAsync(RoomDto dto)
    {
        await ValidateRoomAsync(dto, null);

        var room = new Room
        {
            RoomTypeId = dto.RoomTypeId,
            RoomNumber = dto.RoomNumber,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "available" : dto.Status
        };

        var amenities = await _context.Amenities.Where(a => dto.AmenityIds.Contains(a.AmenityId)).ToListAsync();
        foreach (var amenity in amenities)
        {
            room.Amenities.Add(amenity);
        }

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> UpdateRoomAsync(int roomId, RoomDto dto)
    {
        var room = await _context.Rooms.Include(r => r.Amenities).FirstOrDefaultAsync(r => r.RoomId == roomId);
        if (room == null)
        {
            return false;
        }

        await ValidateRoomAsync(dto, roomId);

        room.RoomTypeId = dto.RoomTypeId;
        room.RoomNumber = dto.RoomNumber;
        room.Status = string.IsNullOrWhiteSpace(dto.Status) ? "available" : dto.Status;

        var amenities = await _context.Amenities.Where(a => dto.AmenityIds.Contains(a.AmenityId)).ToListAsync();
        room.Amenities.Clear();
        foreach (var amenity in amenities)
        {
            room.Amenities.Add(amenity);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteRoomAsync(int roomId)
    {
        var room = await _context.Rooms.FindAsync(roomId);
        if (room == null)
        {
            return false;
        }

        // Pokój z historią rezerwacji (płatności, faktury) nie może zostać usunięty - można go wyłączyć z użytku
        bool hasReservations = await _context.Reservations.AnyAsync(r => r.RoomId == roomId);
        if (hasReservations)
        {
            throw new ArgumentException("Nie można usunąć pokoju, który ma rezerwacje (także historyczne). Zmień jego status na \"Wyłączony\", aby wycofać go z oferty.");
        }

        _context.Rooms.Remove(room);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task ValidateRoomAsync(RoomDto dto, int? excludedRoomId)
    {
        var typeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == dto.RoomTypeId);
        if (!typeExists)
        {
            throw new ArgumentException("Wskazany typ pokoju nie istnieje!");
        }

        if (string.IsNullOrWhiteSpace(dto.RoomNumber))
        {
            throw new ArgumentException("Numer pokoju jest wymagany!");
        }

        var numberTaken = await _context.Rooms.AnyAsync(r => r.RoomNumber == dto.RoomNumber && (excludedRoomId == null || r.RoomId != excludedRoomId));
        if (numberTaken)
        {
            throw new ArgumentException("Pokój o takim numerze już istnieje!");
        }
    }
}