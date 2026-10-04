namespace Services.Settings;

// Konfiguracja wysyłki e-maili - sekcja "Email" w appsettings.json
// Gdy SmtpHost jest pusty, wiadomości zapisywane są jako pliki .eml w katalogu PickupDirectory
public class EmailSettings
{
    public string From {get; set; } = "rezerwacje@hotel-resort.pl";
    public string FromName {get; set; } = "Hotel Resort";
    public string SmtpHost {get; set; } = string.Empty;
    public int SmtpPort {get; set; } = 587;
    public bool EnableSsl {get; set; } = true;
    public string UserName {get; set; } = string.Empty;
    public string Password {get; set; } = string.Empty;
    public string PickupDirectory {get; set; } = "Emails";
}