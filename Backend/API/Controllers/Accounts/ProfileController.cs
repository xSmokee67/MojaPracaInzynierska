using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Interfaces;
using System.Security.Claims;

namespace API.Controllers;

// Profil zalogowanego użytkownika (gość lub właściciel) - podgląd własnego konta z tokenu JWT
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var id))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        var profile = await _profileService.GetProfileAsync(id);
        if (profile == null)
            return NotFound(new { error = "Nie znaleziono konta użytkownika."});

        return Ok(profile);
    }
}