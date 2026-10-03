using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interfaces;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Owner")]
public class AmenityController : ControllerBase
{
    private readonly IAmenityService _amenityService;

    public AmenityController(IAmenityService amenityService)
    {
        _amenityService = amenityService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var amenities = await _amenityService.GetAllAmenitiesAsync();
        return Ok(amenities);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AmenityDto dto)
    {
        try
        {
            await _amenityService.CreateAmenityAsync(dto);
            return Ok(new { message = "Udogodnienie zostało dodane."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AmenityDto dto)
    {
        try
        {
            var success = await _amenityService.UpdateAmenityAsync(id, dto);

            if (!success)
                return NotFound(new { error = "Nie znaleziono udogodnienia."});

            return Ok(new { message = "Udogodnienie zostało zaktualizowane."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _amenityService.DeleteAmenityAsync(id);

        if (!success)
            return NotFound(new { error = "Nie znaleziono udogodnienia."});

        return Ok(new { message = "Udogodnienie zostało usunięte."});
    }
}