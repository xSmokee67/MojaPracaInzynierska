using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Model;
using Services.DTO;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole<int>> _roleManager;
    private readonly IConfiguration _configuration;

    public AuthController(UserManager<User> userManager, RoleManager<IdentityRole<int>> roleManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            return BadRequest(new { error = "Użytkownik o podanym emailu już istnieje." });
        }

        var guest = new Guest
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            PhoneNumber = dto.PhoneNumber,
            AccountType = "guest",
            RegistrationDate = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(guest, dto.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { error = string.Join(" ", result.Errors.Select(e => e.Description)) });
        }

        if (!await _roleManager.RoleExistsAsync("guest"))
        {
            await _roleManager.CreateAsync(new IdentityRole<int>("guest"));
        }

        await _userManager.AddToRoleAsync(guest, "guest");
        return Ok(new { message = "Rejestracja zakończona sukcesem." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            return Unauthorized(new { error = "Nieprawidłowy email lub hasło." });
        }

        // Konto zablokowane po zbyt wielu nieudanych próbach (ustawienia Lockout w Program.cs)
        if (await _userManager.IsLockedOutAsync(user))
        {
            return Unauthorized(new { error = LockoutMessage(user) });
        }

        if (!await _userManager.CheckPasswordAsync(user, dto.Password))
        {
            // Zlicza nieudaną próbę - po przekroczeniu limitu Identity samo ustawia LockoutEnd
            await _userManager.AccessFailedAsync(user);

            if (await _userManager.IsLockedOutAsync(user))
            {
                return Unauthorized(new { error = LockoutMessage(user) });
            }

            return Unauthorized(new { error = "Nieprawidłowy email lub hasło." });
        }

        await _userManager.ResetAccessFailedCountAsync(user);

        var userRoles = await _userManager.GetRolesAsync(user);

        var authClaims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        foreach (var role in userRoles)
        {
            authClaims.Add(new Claim(ClaimTypes.Role, role));
        }

        var jwtSettings = _configuration.GetSection("Jwt");
        var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            expires: DateTime.Now.AddHours(3),
            claims: authClaims,
            signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
        );

        return Ok(new
        {
            token = new JwtSecurityTokenHandler().WriteToken(token),
            expiration = token.ValidTo,
            role = userRoles.FirstOrDefault(),
            // Imię do powitania w pasku nawigacji ("Witaj, Anna")
            firstName = user switch
            {
                Guest guest => guest.FirstName,
                Owner owner => owner.FirstName,
                _ => string.Empty
            }
        });
    }

    private static string LockoutMessage(User user)
    {
        var minutesLeft = (int)Math.Ceiling((user.LockoutEnd!.Value - DateTimeOffset.UtcNow).TotalMinutes);
        return $"Konto zostało tymczasowo zablokowane po kilku nieudanych próbach logowania. Spróbuj ponownie za {minutesLeft} min.";
    }
}