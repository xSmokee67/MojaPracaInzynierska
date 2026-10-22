namespace Services.DTO;

// Odpowiedź na udane logowanie: token JWT, jego ważność, rola i imię do powitania w pasku nawigacji
public class LoginResultDto
{
    public string Token {get; set; } = string.Empty;
    public DateTime Expiration {get; set; }
    public string? Role {get; set; }
    public string FirstName {get; set; } = string.Empty;
}