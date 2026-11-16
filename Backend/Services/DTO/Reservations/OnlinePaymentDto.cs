using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

// Płatność online przez gościa (symulacja bramki płatniczej) - tylko metoda, kwotę wylicza serwis (brakująca do zapłaty).
// Dane karty i kod BLIK sprawdza formularz w przeglądarce - nie są wysyłane do API ani zapisywane w bazie
public class OnlinePaymentDto
{
    [Required(ErrorMessage = "Wybierz metodę płatności.")]
    public string Method {get; set; } = string.Empty;
}
