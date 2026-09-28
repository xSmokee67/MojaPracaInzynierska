using DAL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Owner")]
public class PriceListEntryController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PriceListEntryController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var entries = await _context.PriceListEntries.Include(p => p.RoomType).Select(p => new PriceListEntryDto
        {
            PriceListEntryId = p.PriceListEntryId,
            RoomTypeId = p.RoomTypeId,
            RoomTypeName = p.RoomType.Name,
            StartDate = p.StartDate,
            EndDate = p.EndDate,
            PricePerNight = p.PricePerNight
        }).ToListAsync();

        return Ok(entries);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PriceListEntryDto dto)
    {
        if (dto.StartDate >= dto.EndDate)
        {
            return BadRequest(new { error = "Data rozpoczęcia musi być wcześniejsza niż data zakończenia."});
        }

        var typeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == dto.RoomTypeId);
        
        if(!typeExists)
            return BadRequest(new { error = "Wskazany typ pokoju nie istnieje!"});

        if (dto.PricePerNight <= 0)
            return BadRequest(new { error = "Cena za noc musi być większa od zera."});

        if (await HasOverlappingEntryAsync(dto, null))
            return BadRequest(new { error = "Okres nakłada się na istniejący wpis cennika dla tego typu pokoju."});

        var entry = new PriceListEntry
        {
            RoomTypeId = dto.RoomTypeId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            PricePerNight = dto.PricePerNight
        };

        _context.PriceListEntries.Add(entry);
        await _context.SaveChangesAsync();
        return Ok(new {message = "Cennik sezonowy został zaaktualizowany."});
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PriceListEntryDto dto)
    {
        var entry = await _context.PriceListEntries.FindAsync(id);
        if (entry == null)
            return NotFound(new { error = "Nie znaleziono wpisu w cenniku."});

        if (dto.StartDate >= dto.EndDate)
            return BadRequest(new { error = "Data rozpoczęcia musi być wcześniejsza niż data zakończenia."});

        var typeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == dto.RoomTypeId);
        if (!typeExists)
            return BadRequest(new { error = "Wskazany typ pokoju nie istnieje!"});

        if (dto.PricePerNight <= 0)
            return BadRequest(new { error = "Cena za noc musi być większa od zera."});

        if (await HasOverlappingEntryAsync(dto, id))
            return BadRequest(new { error = "Okres nakłada się na istniejący wpis cennika dla tego typu pokoju."});

        entry.RoomTypeId = dto.RoomTypeId;
        entry.StartDate = dto.StartDate;
        entry.EndDate = dto.EndDate;
        entry.PricePerNight = dto.PricePerNight;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Wpis cennika został zaktualizowany."});
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entry = await _context.PriceListEntries.FindAsync(id);
        if (entry == null)
            return NotFound("Nie znaleziono wpisu w cenniku.");

        _context.PriceListEntries.Remove(entry);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Wpis z cennika został usunięty."});
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