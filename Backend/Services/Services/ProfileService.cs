using Microsoft.AspNetCore.Identity;
using Model;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

// Profil zalogowanego użytkownika - konta są zarządzane przez ASP.NET Core Identity (UserManager)
public class ProfileService : IProfileService
{
    private readonly UserManager<User> _userManager;

    public ProfileService(UserManager<User> userManager)
    {
        _userManager = userManager;
    }

    public async Task<ProfileDto?> GetProfileAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
        {
            return null;
        }

        var profile = new ProfileDto
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            RegistrationDate = user.RegistrationDate
        };

        // Imię i nazwisko są w tabelach Guests / Owners (dziedziczenie TPT)
        switch (user)
        {
            case Guest guest:
                profile.Role = "Guest";
                profile.FirstName = guest.FirstName;
                profile.LastName = guest.LastName;
                profile.PhoneNumber = guest.PhoneNumber;
                profile.DocumentNumber = guest.DocumentNumber;
                break;
            case Owner owner:
                profile.Role = "Owner";
                profile.FirstName = owner.FirstName;
                profile.LastName = owner.LastName;
                break;
        }

        return profile;
    }

    public async Task<bool> UpdateProfileAsync(int userId, UpdateProfileDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.LastName))
        {
            throw new ArgumentException("Imię i nazwisko są wymagane.");
        }

        switch (user)
        {
            case Guest guest:
                if (string.IsNullOrWhiteSpace(dto.PhoneNumber))
                {
                    throw new ArgumentException("Numer telefonu jest wymagany.");
                }

                guest.FirstName = dto.FirstName.Trim();
                guest.LastName = dto.LastName.Trim();
                guest.PhoneNumber = dto.PhoneNumber.Trim();
                guest.DocumentNumber = dto.DocumentNumber.Trim();
                break;
            case Owner owner:
                owner.FirstName = dto.FirstName.Trim();
                owner.LastName = dto.LastName.Trim();
                break;
        }

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw new ArgumentException(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        return true;
    }

    // Identity sprawdza obecne hasło i politykę nowego hasła (min. 8 znaków, cyfra)
    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
        {
            return false;
        }

        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
        {
            throw new ArgumentException(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        return true;
    }
}