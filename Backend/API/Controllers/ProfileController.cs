using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interfaces;
using System.Security.Claims;

namespace API.Controllers;

// Profil zalogowanego użytkownika (gość lub właściciel) - zawsze własne konto z tokenu JWT
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

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var id))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        try
        {
            var success = await _profileService.UpdateProfileAsync(id, dto);

            if (!success)
                return NotFound(new { error = "Nie znaleziono konta użytkownika."});

            return Ok(new { message = "Dane profilu zostały zapisane."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var id))
            return Unauthorized(new { error = "Nie udało się zidentyfikować zalogowanego użytkownika."});

        try
        {
            var success = await _profileService.ChangePasswordAsync(id, dto);

            if (!success)
                return NotFound(new { error = "Nie znaleziono konta użytkownika."});

            return Ok(new { message = "Hasło zostało zmienione."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }
}