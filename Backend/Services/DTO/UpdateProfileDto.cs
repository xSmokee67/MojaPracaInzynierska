using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

// Telefon i numer dokumentu dotyczą tylko konta gościa - właściciel ich nie ma
public class UpdateProfileDto
{
    [Required(ErrorMessage = "Imię jest wymagane.")]
    [StringLength(50, ErrorMessage = "Imię może mieć maksymalnie 50 znaków.")]
    public string FirstName {get; set; } = string.Empty;
    [Required(ErrorMessage = "Nazwisko jest wymagane.")]
    [StringLength(50, ErrorMessage = "Nazwisko może mieć maksymalnie 50 znaków.")]
    public string LastName {get; set; } = string.Empty;
    [RegularExpression(@"^\+?[0-9 ]{9,15}$", ErrorMessage = "Podaj poprawny numer telefonu (9-15 cyfr).")]
    public string PhoneNumber {get; set; } = string.Empty;
    [RegularExpression(@"^[A-Za-z0-9 ]{0,20}$", ErrorMessage = "Numer dokumentu może zawierać tylko litery i cyfry (maksymalnie 20 znaków).")]
    public string DocumentNumber {get; set; } = string.Empty;
}