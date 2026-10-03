using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interfaces;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Owner")]
public class AdditionalServiceController : ControllerBase
{
    private readonly IAdditionalServiceService _additionalServiceService;

    public AdditionalServiceController(IAdditionalServiceService additionalServiceService)
    {
        _additionalServiceService = additionalServiceService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var services = await _additionalServiceService.GetAllAdditionalServicesAsync();
        return Ok(services);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdditionalServiceDto dto)
    {
        try
        {
            await _additionalServiceService.CreateAdditionalServiceAsync(dto);
            return Ok(new { message = "Usługa dodatkowa została dodana."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AdditionalServiceDto dto)
    {
        try
        {
            var success = await _additionalServiceService.UpdateAdditionalServiceAsync(id, dto);

            if (!success)
                return NotFound(new { error = "Nie znaleziono usługi."});

            return Ok(new { message = "Usługa dodatkowa została zaktualizowana."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _additionalServiceService.DeleteAdditionalServiceAsync(id);

        if (!success)
            return NotFound(new { error = "Nie znaleziono usługi."});

        return Ok(new { message = "Usługa została usunięta."});
    }
}