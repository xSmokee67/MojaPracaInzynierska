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
public class AdditionalServiceController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdditionalServiceController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var services = await _context.AdditionalServices.Select(s => new AdditionalServiceDto
        {
            ServiceId = s.ServiceId,
            Name = s.Name,
            Price = s.Price
        }).ToListAsync();

        return Ok(services);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdditionalServiceDto dto)
    {
        var service = new AdditionalService
        {
            Name = dto.Name,
            Price = dto.Price
        };

        _context.AdditionalServices.Add(service);
        await _context.SaveChangesAsync();
        return Ok(new {message = "Usługa dodatkowa została dodana."});
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var service = await _context.AdditionalServices.FindAsync(id);
        if (service == null)
            return NotFound("Nie znaleziono usługi.");

        _context.AdditionalServices.Remove(service);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Usługa została usunięta."});
    }
}