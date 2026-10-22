using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Constants;
using Services.Interfaces;
using System.Globalization;

namespace API.Controllers;

// Moduł zarządzania dostępnością - kalendarz pokoi dla właściciela i kalendarz typu pokoju dla gości
[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = UserRoles.Owner)]
public class AvailabilityController : ControllerBase
{
    private readonly IAvailabilityService _availabilityService;

    public AvailabilityController(IAvailabilityService availabilityService)
    {
        _availabilityService = availabilityService;
    }

    // Kalendarz: wszystkie pokoje i noce z zakresu [from, to), np. ?from=2027-03-01&to=2027-03-15
    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar([FromQuery] string? from, [FromQuery] string? to)
    {
        if (!DateTime.TryParseExact(from, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fromDate) ||
            !DateTime.TryParseExact(to, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var toDate))
        {
            return BadRequest(new { error = "Nieprawidłowy format daty. Oczekiwano YYYY-MM-DD." });
        }

        try
        {
            var calendar = await _availabilityService.GetCalendarAsync(fromDate, toDate);
            return Ok(calendar);
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    // Kalendarz typu pokoju dla gości (bez logowania): liczba wolnych pokoi w każdej nocy, np. /room-type/2?from=2027-03-01&to=2027-04-01
    [HttpGet("room-type/{roomTypeId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRoomTypeCalendar(int roomTypeId, [FromQuery] string? from, [FromQuery] string? to)
    {
        if (!DateTime.TryParseExact(from, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fromDate) ||
            !DateTime.TryParseExact(to, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var toDate))
        {
            return BadRequest(new { error = "Nieprawidłowy format daty. Oczekiwano YYYY-MM-DD." });
        }

        try
        {
            var nights = await _availabilityService.GetRoomTypeCalendarAsync(roomTypeId, fromDate, toDate);

            if (nights == null)
                return NotFound(new { error = "Nie znaleziono typu pokoju." });

            return Ok(nights);
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }
}