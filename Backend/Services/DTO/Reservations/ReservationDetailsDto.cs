namespace Services.DTO;

public class ReservationDetailsDto : ReservationDto
{
    // Saldo: zaksięgowane wpłaty minus zwroty
    public decimal PaidAmount {get; set; }
    // Suma zwrotów (do wyświetlenia w rozliczeniu)
    public decimal RefundedAmount {get; set; }
    // Opłata zatrzymana przy anulowaniu (anulowana rezerwacja) - do zwrotu zostaje PaidAmount - CancellationFee
    public decimal CancellationFee {get; set; }
    // Warunki anulowania dla aktywnej rezerwacji: ostatni dzień bezpłatnego anulowania i opłata przy anulowaniu dzisiaj
    public DateTime FreeCancellationUntil {get; set; }
    public decimal CancellationFeeIfCancelledToday {get; set; }
    public List<PaymentDto> Payments {get; set; } = new ();
    public InvoiceDto? Invoice {get; set; }
    public ReviewDto? Review {get; set; }
}