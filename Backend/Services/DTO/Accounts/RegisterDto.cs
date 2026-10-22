using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class RegisterDto
{
    [Required(ErrorMessage = "Adres e-mail jest wymagany.")]
    [EmailAddress(ErrorMessage = "Podaj poprawny adres e-mail.")]
    public string Email { get; set; } = string.Empty;
    [Required(ErrorMessage = "Hasło jest wymagane.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Hasło musi mieć co najmniej 8 znaków.")]
    public string Password { get; set; } = string.Empty;
    [Required(ErrorMessage = "Imię jest wymagane.")]
    [StringLength(50, ErrorMessage = "Imię może mieć maksymalnie 50 znaków.")]
    public string FirstName { get; set; } = string.Empty;
    [Required(ErrorMessage = "Nazwisko jest wymagane.")]
    [StringLength(50, ErrorMessage = "Nazwisko może mieć maksymalnie 50 znaków.")]
    public string LastName { get; set; } = string.Empty;
    [Required(ErrorMessage = "Numer telefonu jest wymagany.")]
    [RegularExpression(@"^\+?[0-9 ]{9,15}$", ErrorMessage = "Podaj poprawny numer telefonu (9-15 cyfr).")]
    public string PhoneNumber { get; set; } = string.Empty;
}