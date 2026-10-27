using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Interfaces;
using System.Security.Claims;

namespace API.Controllers;

// Powiadomienia zalogowanego użytkownika (gość lub właściciel) - zawsze własne, na podstawie tokenu JWT
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        var notifications = await _notificationService.GetUserNotificationsAsync(userId);
        return Ok(notifications);
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        var success = await _notificationService.MarkAsReadAsync(id, userId);
        if (!success)
            return NotFound(new { error = "Nie znaleziono powiadomienia."});

        return Ok(new { message = "Powiadomienie oznaczone jako przeczytane."});
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        await _notificationService.MarkAllAsReadAsync(userId);
        return Ok(new { message = "Wszystkie powiadomienia oznaczone jako przeczytane."});
    }
}