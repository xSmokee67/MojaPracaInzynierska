using DAL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;
using System.Security.Claims;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ReviewController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ReviewController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var reviews = await _context.Reviews
            .Include(r => r.Guest)
            .Include(r => r.Reservation)
                .ThenInclude(res => res.Room)
                    .ThenInclude(room => room.RoomType)
            .OrderByDescending(r => r.Date)
            .Select(r => new ReviewDto
            {
                ReviewId = r.ReviewId,
                GuestId = r.GuestId,
                GuestName = r.Guest.FirstName + " " + r.Guest.LastName,
                ReservationId = r.ReservationId,
                RoomTypeName = r.Reservation.Room.RoomType.Name,
                Rating = r.Rating,
                Comment = r.Comment,
                Date = r.Date
            }).ToListAsync();

        return Ok(reviews);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] ReviewDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var guestId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        if (dto.Rating < 1 || dto.Rating > 5)
            return BadRequest(new { error = "Ocena musi mieścić się w zakresie 1-5."});

        var reservation = await _context.Reservations
            .Include(r => r.Review)
            .FirstOrDefaultAsync(r => r.ReservationId == dto.ReservationId && r.GuestId == guestId);

        if (reservation == null)
            return NotFound(new { error = "Nie znaleziono rezerwacji."});

        if (reservation.Status != "completed")
            return BadRequest(new { error = "Opinię można dodać dopiero po zakończonym pobycie."});

        if (reservation.Review != null)
            return BadRequest(new { error = "Opinia do tego pobytu została już dodana."});

        var review = new Review
        {
            GuestId = guestId,
            ReservationId = reservation.ReservationId,
            Rating = dto.Rating,
            Comment = dto.Comment,
            Date = DateTime.UtcNow
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Dziękujemy za wystawienie opinii!"});
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null)
            return NotFound(new { error = "Nie znaleziono opinii."});

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Opinia została usunięta."});
    }
}