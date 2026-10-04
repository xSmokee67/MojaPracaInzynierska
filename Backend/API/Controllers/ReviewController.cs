using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interfaces;
using System.Security.Claims;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ReviewController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var reviews = await _reviewService.GetAllReviewsAsync();
        return Ok(reviews);
    }

    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetMyReviews()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var guestId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        var reviews = await _reviewService.GetGuestReviewsAsync(guestId);
        return Ok(reviews);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] ReviewDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var guestId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        dto.GuestId = guestId;

        try
        {
            var success = await _reviewService.CreateReviewAsync(dto);

            if (!success)
                return NotFound(new { error = "Nie znaleziono rezerwacji."});

            return Ok(new { message = "Dziękujemy za wystawienie opinii!"});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _reviewService.DeleteReviewAsync(id);

        if (!success)
            return NotFound(new { error = "Nie znaleziono opinii."});

        return Ok(new { message = "Opinia została usunięta."});
    }
}