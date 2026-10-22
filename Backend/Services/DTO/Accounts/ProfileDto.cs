namespace Services.DTO;

// Dane konta zalogowanego użytkownika (strona "Mój profil")
public class ProfileDto
{
    public int UserId {get; set; }
    public string Email {get; set; } = string.Empty;
    public string FirstName {get; set; } = string.Empty;
    public string LastName {get; set; } = string.Empty;
    public string PhoneNumber {get; set; } = string.Empty;
    public string DocumentNumber {get; set; } = string.Empty;
    public string Role {get; set; } = string.Empty;
    public DateTime RegistrationDate {get; set; }
}