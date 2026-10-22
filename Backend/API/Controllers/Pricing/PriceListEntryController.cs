using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Constants;
using Services.DTO;
using Services.Interfaces;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = UserRoles.Owner)]
public class PriceListEntryController : ControllerBase
{
    private readonly IPriceListEntryService _priceListEntryService;

    public PriceListEntryController(IPriceListEntryService priceListEntryService)
    {
        _priceListEntryService = priceListEntryService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var entries = await _priceListEntryService.GetAllPriceListEntriesAsync();
        return Ok(entries);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PriceListEntryDto dto)
    {
        try
        {
            await _priceListEntryService.CreatePriceListEntryAsync(dto);
            return Ok(new { message = "Cennik sezonowy został zaktualizowany."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PriceListEntryDto dto)
    {
        try
        {
            var success = await _priceListEntryService.UpdatePriceListEntryAsync(id, dto);

            if (!success)
                return NotFound(new { error = "Nie znaleziono wpisu w cenniku."});

            return Ok(new { message = "Wpis cennika został zaktualizowany."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _priceListEntryService.DeletePriceListEntryAsync(id);

        if (!success)
            return NotFound(new { error = "Nie znaleziono wpisu w cenniku."});

        return Ok(new { message = "Wpis z cennika został usunięty."});
    }
}