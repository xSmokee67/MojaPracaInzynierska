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
        var rooms = await _context.Rooms.Include(r => r.RoomType).Include(r => r.Amenities).Select(r => new RoomDto
        {
            RoomId = r.RoomId,
            RoomTypeId = r.RoomTypeId,
            RoomTypeName = r.RoomType.Name,
            RoomNumber = r.RoomNumber,
            Status = r.Status,
            AmenityIds = r.Amenities.Select(a => a.AmenityId).ToList(),
            AmenityNames = r.Amenities.Select(a => a.Name).ToList()
        }).ToListAsync();

        return Ok(rooms);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoomDto dto)
    {
        var typeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == dto.RoomTypeId);
        if (!typeExists) 
            return BadRequest(new { error = "Wskazany typ pokoju nie istenieje!"});

        if (string.IsNullOrWhiteSpace(dto.RoomNumber))
            return BadRequest(new { error = "Numer pokoju jest wymagany!"});

        var numberTaken = await _context.Rooms.AnyAsync(r => r.RoomNumber == dto.RoomNumber);
        if (numberTaken)
            return BadRequest(new { error = "Pokój o takim numerze już istnieje!"});

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

        return Ok(new { message = "Pokój został pomyślnie dodany!"});
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RoomDto dto)
    {

        var room = await _context.Rooms.Include(r => r.Amenities).FirstOrDefaultAsync(r => r.RoomId == id);
        if (room == null)
            return NotFound(new { error = "Nie znaleziono pokoju!"});


        var typeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == dto.RoomTypeId);
        if (!typeExists) 
            return BadRequest(new { error = "Wskazany typ pokoju nie istenieje!"});

        if (string.IsNullOrWhiteSpace(dto.RoomNumber))
            return BadRequest(new { error = "Numer pokoju jest wymagany!"});

        var numberTaken = await _context.Rooms.AnyAsync(r => r.RoomNumber == dto.RoomNumber && r.RoomId != id);
        if (numberTaken)
            return BadRequest(new { error = "Pokój o takim numerze już istnieje!"});

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