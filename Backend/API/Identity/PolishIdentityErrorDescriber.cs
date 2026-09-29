using Microsoft.AspNetCore.Identity;

namespace API.Identity;

// Polskie komunikaty błędów ASP.NET Core Identity (rejestracja, polityka haseł)
public class PolishIdentityErrorDescriber : IdentityErrorDescriber
{
    public override IdentityError DuplicateEmail(string email) =>
        new IdentityError { Code = nameof(DuplicateEmail), Description = $"Adres e-mail {email} jest już zajęty." };

    public override IdentityError DuplicateUserName(string userName) =>
        new IdentityError { Code = nameof(DuplicateUserName), Description = $"Użytkownik {userName} już istnieje." };

    public override IdentityError InvalidEmail(string? email) =>
        new IdentityError { Code = nameof(InvalidEmail), Description = "Podaj poprawny adres e-mail." };

    public override IdentityError InvalidUserName(string? userName) =>
        new IdentityError { Code = nameof(InvalidUserName), Description = "Nazwa użytkownika zawiera niedozwolone znaki." };

    public override IdentityError PasswordTooShort(int length) =>
        new IdentityError { Code = nameof(PasswordTooShort), Description = $"Hasło musi mieć co najmniej {length} znaków." };

    public override IdentityError PasswordRequiresDigit() =>
        new IdentityError { Code = nameof(PasswordRequiresDigit), Description = "Hasło musi zawierać co najmniej jedną cyfrę." };

    public override IdentityError PasswordRequiresLower() =>
        new IdentityError { Code = nameof(PasswordRequiresLower), Description = "Hasło musi zawierać co najmniej jedną małą literę." };

    public override IdentityError PasswordRequiresUpper() =>
        new IdentityError { Code = nameof(PasswordRequiresUpper), Description = "Hasło musi zawierać co najmniej jedną wielką literę." };

    public override IdentityError PasswordRequiresNonAlphanumeric() =>
        new IdentityError { Code = nameof(PasswordRequiresNonAlphanumeric), Description = "Hasło musi zawierać co najmniej jeden znak specjalny." };

    public override IdentityError PasswordRequiresUniqueChars(int uniqueChars) =>
        new IdentityError { Code = nameof(PasswordRequiresUniqueChars), Description = $"Hasło musi zawierać co najmniej {uniqueChars} różnych znaków." };
}