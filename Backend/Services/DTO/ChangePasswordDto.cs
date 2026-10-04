using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class ChangePasswordDto
{
    [Required(ErrorMessage = "Podaj obecne hasło.")]
    public string CurrentPassword {get; set; } = string.Empty;
    [Required(ErrorMessage = "Podaj nowe hasło.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Hasło musi mieć co najmniej 8 znaków.")]
    public string NewPassword {get; set; } = string.Empty;
}