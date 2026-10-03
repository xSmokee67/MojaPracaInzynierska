using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interfaces;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Owner")]
public class RoomController : ControllerBase
{
    private readonly IRoomService _roomService;

    public RoomController(IRoomService roomService)
    {
        _roomService = roomService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rooms = await _roomService.GetAllRoomsAsync();
        return Ok(rooms);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoomDto dto)
    {
        try
        {
            await _roomService.CreateRoomAsync(dto);
            return Ok(new { message = "Pokój został pomyślnie dodany!"});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RoomDto dto)
    {
        try
        {
            var success = await _roomService.UpdateRoomAsync(id, dto);

            if (!success)
                return NotFound(new { error = "Nie znaleziono pokoju!"});

            return Ok(new { message = "Dane pokoju zostały zaktualizowane!"});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var success = await _roomService.DeleteRoomAsync(id);

            if (!success)
                return NotFound(new { error = "Nie znaleziono pokoju!"});

            return Ok(new { message = "Pokój został usunięty!"});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }
}