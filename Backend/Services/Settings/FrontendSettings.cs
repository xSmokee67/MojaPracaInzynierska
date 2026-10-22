namespace Services.Settings;

// Adres aplikacji React - sekcja "Frontend" w appsettings.json
// Używany w polityce CORS (API przyjmuje zapytania z przeglądarki tylko z tego adresu)
public class FrontendSettings
{
    public string BaseUrl {get; set; } = "http://localhost:5173";
}