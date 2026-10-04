using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

// E-mail i token pochodzą z linku wysłanego w wiadomości (#/reset-hasla?email=...&token=...)
public class ResetPasswordDto
{
    [Required(ErrorMessage = "Adres e-mail jest wymagany.")]
    [EmailAddress(ErrorMessage = "Podaj poprawny adres e-mail.")]
    public string Email {get; set; } = string.Empty;
    [Required(ErrorMessage = "Link do resetu hasła jest niepełny. Skopiuj cały link z wiadomości.")]
    public string Token {get; set; } = string.Empty;
    [Required(ErrorMessage = "Podaj nowe hasło.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Hasło musi mieć co najmniej 8 znaków.")]
    public string NewPassword {get; set; } = string.Empty;
}