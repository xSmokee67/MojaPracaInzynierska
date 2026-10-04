using Microsoft.AspNetCore.Identity;
using Model;
using Services.DTO;
using Services.Interfaces;
using Services.Settings;

namespace Services.Services;

// Reset hasła: jednorazowy token ASP.NET Core Identity wysyłany e-mailem w linku do aplikacji React
public class PasswordResetService : IPasswordResetService
{
    // Ważność tokenu ustawiana w Program.cs (DataProtectionTokenProviderOptions)
    public const int TokenValidHours = 2;

    private readonly UserManager<User> _userManager;
    private readonly IEmailService _emailService;
    private readonly FrontendSettings _frontendSettings;

    public PasswordResetService(UserManager<User> userManager, IEmailService emailService, FrontendSettings frontendSettings)
    {
        _userManager = userManager;
        _emailService = emailService;
        _frontendSettings = frontendSettings;
    }

    // Dla nieistniejącego konta nic się nie dzieje - odpowiedź API jest taka sama,
    // żeby formularza nie dało się użyć do sprawdzania, które adresy e-mail mają konto
    public async Task SendResetLinkAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || string.IsNullOrEmpty(user.Email))
        {
            return;
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var resetLink = $"{_frontendSettings.BaseUrl.TrimEnd('/')}/#/reset-hasla?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(token)}";

        var firstName = user switch
        {
            Guest guest => guest.FirstName,
            Owner owner => owner.FirstName,
            _ => string.Empty
        };

        await _emailService.SendAsync(user.Email, "Reset hasła - Hotel Resort", EmailTemplates.PasswordReset(firstName, resetLink, TokenValidHours));
    }

    public async Task ResetPasswordAsync(ResetPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            throw new ArgumentException("Link do resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy link.");
        }

        var result = await _userManager.ResetPasswordAsync(user, dto.Token, dto.NewPassword);
        if (!result.Succeeded)
        {
            throw new ArgumentException(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        // Nowe hasło zdejmuje blokadę konta po nieudanych próbach logowania
        await _userManager.ResetAccessFailedCountAsync(user);
        await _userManager.SetLockoutEndDateAsync(user, null);
    }
}