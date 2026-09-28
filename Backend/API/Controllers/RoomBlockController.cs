using DAL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;
using Services.Interfaces;
using System.Security.Claims;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Owner")]
public class RoomBlockController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAvailabilityService _availabilityService;

    public RoomBlockController(ApplicationDbContext context, IAvailabilityService availabilityService)
    {
        _context = context;
        _availabilityService = availabilityService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? roomId)
    {
        var blocks = await _context.RoomBlocks
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

        return Ok(blocks);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoomBlockDto dto)
    {
        if (dto.StartDate >= dto.EndDate)
            return BadRequest(new { error = "Data rozpoczęcia blokady musi być wcześniejsza niż data zakończenia."});

        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new { error = "Podaj powód blokady (np. remont, konserwacja)."});

        var roomExists = await _context.Rooms.AnyAsync(r => r.RoomId == dto.RoomId);
        if (!roomExists)
            return BadRequest(new { error = "Wskazany pokój nie istnieje!"});

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var ownerId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        // Te same warunki nakładania się terminów co w ReservationService.GetAvailableRoomIdAsync
        var hasReservations = await _context.Reservations.AnyAsync(r =>
            r.RoomId == dto.RoomId &&
            r.Status != "cancelled" &&
            r.CheckInDate < dto.EndDate &&
            r.CheckOutDate > dto.StartDate);

        if (hasReservations)
            return BadRequest(new { error = "W tym terminie pokój ma aktywne rezerwacje. Najpierw je anuluj lub wybierz inny termin."});

        var hasBlocks = await _context.RoomBlocks.AnyAsync(b =>
            b.RoomId == dto.RoomId &&
            b.StartDate < dto.EndDate &&
            b.EndDate > dto.StartDate);

        if (hasBlocks)
            return BadRequest(new { error = "Pokój jest już zablokowany w części tego terminu."});

        var block = new RoomBlock
        {
            RoomId = dto.RoomId,
            OwnerId = ownerId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Reason = dto.Reason
        };

        _context.RoomBlocks.Add(block);
        await _context.SaveChangesAsync();

        await _availabilityService.UpdateAvailabilityAsync(block.RoomId, block.StartDate, block.EndDate, "blocked");

        return Ok(new { message = "Blokada pokoju została utworzona."});
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var block = await _context.RoomBlocks.FindAsync(id);
        if (block == null)
            return NotFound(new { error = "Nie znaleziono blokady."});

        _context.RoomBlocks.Remove(block);
        await _context.SaveChangesAsync();

        await _availabilityService.UpdateAvailabilityAsync(block.RoomId, block.StartDate, block.EndDate, "free");

        return Ok(new { message = "Blokada została usunięta."});
    }
}