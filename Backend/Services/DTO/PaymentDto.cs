using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class PaymentDto
{
    public int PaymentId {get; set; }
    public int ReservationId {get; set; }
    [Range(0.01, 1000000, ErrorMessage = "Kwota płatności musi być większa od zera.")]
    public decimal Amount {get; set; }
    public DateTime PaymentDate {get; set; }
    [Required(ErrorMessage = "Wybierz metodę płatności.")]
    public string Method {get; set; } = string.Empty;
    public string Status {get; set; } = string.Empty;
}