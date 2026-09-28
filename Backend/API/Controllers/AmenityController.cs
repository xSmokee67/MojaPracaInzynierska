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
public class AmenityController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AmenityController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var amenities = await _context.Amenities.Select(a => new AmenityDto
        {
            AmenityId = a.AmenityId,
            Name = a.Name
        }).ToListAsync();

        return Ok(amenities);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AmenityDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Nazwa udogodnienia jest wymagana."});

        var nameTaken = await _context.Amenities.AnyAsync(a => a.Name == dto.Name);
        if (nameTaken)
            return BadRequest(new { error = "Udogodnienie o takiej nazwie już istnieje."});

        var amenity = new Amenity
        {
            Name = dto.Name
        };

        _context.Amenities.Add(amenity);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Udogodnienie zostało dodane."});
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AmenityDto dto)
    {
        var amenity = await _context.Amenities.FindAsync(id);
        if (amenity == null)
            return NotFound(new { error = "Nie znaleziono udogodnienia."});

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Nazwa udogodnienia jest wymagana."});

        var nameTaken = await _context.Amenities.AnyAsync(a => a.Name == dto.Name && a.AmenityId != id);
        if (nameTaken)
            return BadRequest(new { error = "Udogodnienie o takiej nazwie już istnieje."});

        amenity.Name = dto.Name;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Udogodnienie zostało zaktualizowane."});
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var amenity = await _context.Amenities.FindAsync(id);
        if (amenity == null)
            return NotFound(new { error = "Nie znaleziono udogodnienia."});

        _context.Amenities.Remove(amenity);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Udogodnienie zostało usunięte."});
    }
}