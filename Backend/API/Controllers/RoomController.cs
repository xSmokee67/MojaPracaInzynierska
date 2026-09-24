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
public class RoomController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    
    public RoomController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rooms = await _context.Rooms.Include(r => r.RoomType).Select(r => new RoomDto
        {
            RoomId = r.RoomId,
            RoomTypeId = r.RoomTypeId,
            RoomTypeName = r.RoomType.Name,
            RoomNumber = r.RoomNumber,
            Status = r.Status
        }).ToListAsync();

        return Ok(rooms);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoomDto dto)
    {
        var typeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == dto.RoomTypeId);
        if (!typeExists) 
            return BadRequest(new { error = "Wskazany typ pokoju nie istenieje!"});

        var room = new Room
        {
            RoomTypeId = dto.RoomTypeId,
            RoomNumber = dto.RoomNumber,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "available" : dto.Status
        };

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Pokój został pomyślnie dodany!"});
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RoomDto dto)
    {

        var room = await _context.Rooms.FindAsync(id);
        if (room == null)
            return NotFound(new { error = "Nie znaleziono pokoju!"});


        var typeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == dto.RoomTypeId);
        if (!typeExists) 
            return BadRequest(new { error = "Wskazany typ pokoju nie istenieje!"});

        room.RoomTypeId = dto.RoomTypeId;
        room.RoomNumber = dto.RoomNumber;
        room.Status = dto.Status;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Dane pokoju zostały zaaktualizowane!"});
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var room = await _context.Rooms.FindAsync(id);
        if (room == null)
            return NotFound(new { error = "Nie znaleziono pokoju!"});

        _context.Rooms.Remove(room);
        await _context.SaveChangesAsync();

        return Ok(new {message = "Pokój został usunięty!"});
    }
}