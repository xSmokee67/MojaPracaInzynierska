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
public class RoomTypeController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RoomTypeController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var roomTypes = await _context.RoomTypes.Select(rt => new RoomTypeDto
        {
            RoomTypeId = rt.RoomTypeId,
            Name = rt.Name,
            BasePrice = rt.BasePrice,
            MaxOccupancy = rt.MaxOccupancy
        })
        .ToListAsync();

        return Ok(roomTypes);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoomTypeDto dto)
    {
        var roomType = new RoomType
        {
            Name = dto.Name,
            BasePrice  = dto.BasePrice,
            MaxOccupancy = dto.MaxOccupancy
        };

        _context.RoomTypes.Add(roomType);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Typ pokoju został pomyślnie utworzony."});
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RoomTypeDto dto)
    {
        var roomType = await _context.RoomTypes.FindAsync(id);
        if (roomType == null)
            return NotFound(new { error = "Nie znaleziono typu pokoju."});

            roomType.Name = dto.Name;
            roomType.BasePrice = dto.BasePrice;
            roomType.MaxOccupancy = dto.MaxOccupancy;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Typ pokoju został zaaktualizowany."});
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete (int id)
    {
        var roomType = await _context.RoomTypes.FindAsync(id);
        if (roomType == null)
        return NotFound("Nie znaleziono typu pokoju.");

        bool hasRooms = await _context.Rooms.AnyAsync(r => r.RoomTypeId == id);
        if (hasRooms)
        return BadRequest(new { error = "Nie można usunąć typu pokoju, posiada on przypisane pokoje do siebie!"});

        _context.RoomTypes.Remove(roomType);
        await _context.SaveChangesAsync();

        return Ok(new {message = "Usunięto typ pokoju!"});
    }

}