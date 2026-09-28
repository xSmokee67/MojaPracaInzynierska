using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interfaces;
using System.Globalization;
using System.Security.Claims;

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

            if (ci >= co || ci.Date < DateTime.Today)
                return BadRequest(new { error = "Nieprawidłowy termin pobytu - data zameldowania nie może być w przeszłości i musi poprzedzać datę wymeldowania." });

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
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var guestId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        dto.GuestId = guestId;

        if (dto.CheckInDate >= dto.CheckOutDate || dto.CheckInDate.Date < DateTime.Today)
            return BadRequest(new { error = "Nieprawidłowy termin pobytu - data zameldowania nie może być w przeszłości i musi poprzedzać datę wymeldowania."});

        var success = await _reservationService.CreateReservationAsync(dto);

        if(!success)
        return BadRequest(new { error = "Niestety, pokój został przed chwilą zarezerwowany, lub jest już niedostępny."});

        return Ok(new { message = "Rezerwacja została pomyślnie utworzona!"});
    }

    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetMyReservations()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var guestId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        var reservations = await _reservationService.GetGuestReservationsAsync(guestId);
        return Ok(reservations);
    }

    [HttpGet("all")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> GetAllReservations()
    {
        var reservations = await _reservationService.GetAllReservationsAsync();
        return Ok(reservations);
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateReservationStatusDto dto)
    {
        try
        {
            var success = await _reservationService.UpdateReservationStatusAsync(id, dto.Status);

            if (!success)
                return NotFound(new { error = "Nie znaleziono rezerwacji."});

            return Ok(new { message = "Status rezerwacji został zaktualizowany."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetDetails(int id)
    {
        var reservation = await _reservationService.GetReservationDetailsAsync(id);
        if (reservation == null)
            return NotFound(new { error = "Nie znaleziono rezerwacji."});

        // Gość widzi tylko swoje rezerwacje, Właściciel - wszystkie
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!User.IsInRole("Owner") && reservation.GuestId.ToString() != userId)
            return Forbid();

        return Ok(reservation);
    }

    [HttpPut("{id}/cancel")]
    [Authorize]
    public async Task<IActionResult> CancelByGuest(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var guestId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        try
        {
            var success = await _reservationService.CancelReservationByGuestAsync(id, guestId);

            if (!success)
                return NotFound(new { error = "Nie znaleziono rezerwacji."});

            return Ok(new { message = "Rezerwacja została anulowana."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpPost("{id}/payments")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> RegisterPayment(int id, [FromBody] PaymentDto dto)
    {
        try
        {
            var success = await _reservationService.RegisterPaymentAsync(id, dto);

            if (!success)
                return NotFound(new { error = "Nie znaleziono rezerwacji."});

            return Ok(new { message = "Płatność została zarejestrowana."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpPost("{id}/invoice")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> IssueInvoice(int id)
    {
        try
        {
            var success = await _reservationService.IssueInvoiceAsync(id);

            if (!success)
                return NotFound(new { error = "Nie znaleziono rezerwacji."});

            return Ok(new { message = "Faktura została wystawiona."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }
}