using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interfaces;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IPasswordResetService _passwordResetService;

    public AuthController(IAuthService authService, IPasswordResetService passwordResetService)
    {
        _authService = authService;
        _passwordResetService = passwordResetService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        try
        {
            await _authService.RegisterAsync(dto);
            return Ok(new { message = "Rejestracja zakończona sukcesem." });
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            var result = await _authService.LoginAsync(dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException e)
        {
            return Unauthorized(new { error = e.Message });
        }
    }

    // Krok 1 resetu hasła: e-mail z linkiem (odpowiedź jest taka sama niezależnie od tego, czy konto istnieje)
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        await _passwordResetService.SendResetLinkAsync(dto.Email);
        return Ok(new { message = "Jeśli konto o podanym adresie istnieje, wysłaliśmy na nie link do ustawienia nowego hasła." });
    }

    // Krok 2 resetu hasła: nowe hasło z tokenem z linku
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        try
        {
            await _passwordResetService.ResetPasswordAsync(dto);
            return Ok(new { message = "Hasło zostało zmienione. Możesz się teraz zalogować." });
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }
}