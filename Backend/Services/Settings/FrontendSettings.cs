namespace Services.Settings;

// Adres aplikacji React - sekcja "Frontend" w appsettings.json
// Używany w linkach w e-mailach (reset hasła) i w polityce CORS
public class FrontendSettings
{
    public string BaseUrl {get; set; } = "http://localhost:5173";
}