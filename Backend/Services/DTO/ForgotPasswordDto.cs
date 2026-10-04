using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class ForgotPasswordDto
{
    [Required(ErrorMessage = "Adres e-mail jest wymagany.")]
    [EmailAddress(ErrorMessage = "Podaj poprawny adres e-mail.")]
    public string Email {get; set; } = string.Empty;
}