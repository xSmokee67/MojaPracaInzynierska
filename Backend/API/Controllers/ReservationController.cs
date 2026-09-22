using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interfaces;
using System.Globalization;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]

public class ReservationController : ControllerBase
{
    private readonly IReservationService _reservationService;

    public ReservationController(IReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    [HttpGet("availability")]
    public async Task<IActionResult> CheckAvailability([FromQuery] int roomTypeId, [FromQuery] string checkIn, [FromQuery] string checkOut)
    {
        try
        {
            if (!DateTime.TryParseExact(checkIn, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var ci) || 
                !DateTime.TryParseExact(checkOut, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var co))
            {
                return BadRequest(new { error = "Nieprawidłowy format daty. Oczekiwano YYYY-MM-DD." });
            }

            var roomId = await _reservationService.GetAvailableRoomIdAsync(roomTypeId, ci, co);
            
            if (roomId == null)
                return Ok(new { isAvailable = false, message = "Brak wolnych pokoi w wybranym terminie." });

            return Ok(new { isAvailable = true, message = "Pokoje są dostępne!" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"BŁĄD: {ex.Message}");
            return StatusCode(500, new { error = "Wystąpił błąd serwera. Sprawdź terminal API." });
        }
    }

    [HttpPost("price")]
    public async Task<IActionResult> CalculatePrice([FromBody] CreateReservationDto dto)
    {
        try
        {
            var price = await _reservationService.CalculateTotalPriceAsync(
                dto.RoomTypeId,
                dto.CheckInDate,
                dto.CheckOutDate,
                dto.AdditionalServiceIds);

                return Ok(new { totalPrice = price});
        }

        catch (Exception e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpPost("create")]
    [Authorize]
public async Task<IActionResult> CreateReservation([FromBody] CreateReservationDto dto)
    {
        var success = await _reservationService.CreateReservationAsync(dto);

        if(!success)
        return BadRequest(new { error = "Niestety, pokój został przed chwilą zarezerwowany, lub jest już niedostępny."});

        return Ok(new { message = "Rezerwacja została pomyślnie utworzona!"});
    }
}