using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interfaces;
using System.Security.Claims;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Owner")]
public class RoomBlockController : ControllerBase
{
    private readonly IRoomBlockService _roomBlockService;

    public RoomBlockController(IRoomBlockService roomBlockService)
    {
        _roomBlockService = roomBlockService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? roomId)
    {
        var blocks = await _roomBlockService.GetAllRoomBlocksAsync(roomId);
        return Ok(blocks);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoomBlockDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var ownerId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        dto.OwnerId = ownerId;

        try
        {
            await _roomBlockService.CreateRoomBlockAsync(dto);
            return Ok(new { message = "Blokada pokoju została utworzona."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _roomBlockService.DeleteRoomBlockAsync(id);

        if (!success)
            return NotFound(new { error = "Nie znaleziono blokady."});

        return Ok(new { message = "Blokada została usunięta."});
    }
}