namespace Services.DTO;

public class ReservationDetailsDto : ReservationDto
{
    // Saldo: zaksięgowane wpłaty minus zwroty
    public decimal PaidAmount {get; set; }
    // Suma zwrotów (do wyświetlenia w rozliczeniu)
    public decimal RefundedAmount {get; set; }
    public List<PaymentDto> Payments {get; set; } = new ();
    public InvoiceDto? Invoice {get; set; }
    public ReviewDto? Review {get; set; }
}