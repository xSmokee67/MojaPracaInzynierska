using Microsoft.AspNetCore.Identity;
using Model;
using Services.Constants;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

// Profil zalogowanego użytkownika (podgląd danych konta) - konta są zarządzane przez ASP.NET Core Identity (UserManager)
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
                profile.Role = UserRoles.Guest;
                profile.FirstName = guest.FirstName;
                profile.LastName = guest.LastName;
                profile.PhoneNumber = guest.PhoneNumber;
                profile.DocumentNumber = guest.DocumentNumber;
                break;
            case Owner owner:
                profile.Role = UserRoles.Owner;
                profile.FirstName = owner.FirstName;
                profile.LastName = owner.LastName;
                break;
        }

        return profile;
    }
}