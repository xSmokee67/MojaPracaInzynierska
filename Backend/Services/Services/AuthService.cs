using Microsoft.AspNetCore.Identity;
using Model;
using Services.Constants;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

// Rejestracja gości i logowanie - konta są zarządzane przez ASP.NET Core Identity (UserManager)
public class AuthService : IAuthService
{
    private const string InvalidCredentialsMessage = "Nieprawidłowy email lub hasło.";

    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole<int>> _roleManager;
    private readonly ITokenService _tokenService;

    public AuthService(UserManager<User> userManager, RoleManager<IdentityRole<int>> roleManager, ITokenService tokenService)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _tokenService = tokenService;
    }

    public async Task RegisterAsync(RegisterDto dto)
    {
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            throw new ArgumentException("Użytkownik o podanym emailu już istnieje.");
        }

        var guest = new Guest
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            PhoneNumber = dto.PhoneNumber,
            AccountType = AccountTypes.Guest,
            RegistrationDate = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(guest, dto.Password);
        if (!result.Succeeded)
        {
            throw new ArgumentException(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        if (!await _roleManager.RoleExistsAsync(UserRoles.Guest))
        {
            await _roleManager.CreateAsync(new IdentityRole<int>(UserRoles.Guest));
        }

        await _userManager.AddToRoleAsync(guest, UserRoles.Guest);
    }

    // Nieudane logowanie (złe dane albo blokada konta) kończy się wyjątkiem UnauthorizedAccessException - kontroler zwraca 401
    public async Task<LoginResultDto> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            throw new UnauthorizedAccessException(InvalidCredentialsMessage);
        }

        // Konto zablokowane po zbyt wielu nieudanych próbach (ustawienia Lockout w Program.cs)
        if (await _userManager.IsLockedOutAsync(user))
        {
            throw new UnauthorizedAccessException(LockoutMessage(user));
        }

        if (!await _userManager.CheckPasswordAsync(user, dto.Password))
        {
            // Zlicza nieudaną próbę - po przekroczeniu limitu Identity samo ustawia LockoutEnd
            await _userManager.AccessFailedAsync(user);

            if (await _userManager.IsLockedOutAsync(user))
            {
                throw new UnauthorizedAccessException(LockoutMessage(user));
            }

            throw new UnauthorizedAccessException(InvalidCredentialsMessage);
        }

        await _userManager.ResetAccessFailedCountAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        var (token, expiration) = _tokenService.CreateToken(user, roles);

        return new LoginResultDto
        {
            Token = token,
            Expiration = expiration,
            Role = roles.FirstOrDefault(),
            // Imię do powitania w pasku nawigacji ("Witaj, Anna") - przechowywane w tabelach Guests / Owners
            FirstName = user switch
            {
                Guest guest => guest.FirstName,
                Owner owner => owner.FirstName,
                _ => string.Empty
            }
        };
    }

    private static string LockoutMessage(User user)
    {
        var minutesLeft = (int)Math.Ceiling((user.LockoutEnd!.Value - DateTimeOffset.UtcNow).TotalMinutes);
        return $"Konto zostało tymczasowo zablokowane po kilku nieudanych próbach logowania. Spróbuj ponownie za {minutesLeft} min.";
    }
}