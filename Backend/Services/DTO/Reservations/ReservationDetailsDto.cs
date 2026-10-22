namespace Services.DTO;

public class ReservationDetailsDto : ReservationDto
{
    public decimal PaidAmount {get; set; }
    public List<PaymentDto> Payments {get; set; } = new ();
    public InvoiceDto? Invoice {get; set; }
    public ReviewDto? Review {get; set; }
}