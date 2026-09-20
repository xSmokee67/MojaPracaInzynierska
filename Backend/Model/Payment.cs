using System;

namespace Model;

public class Payment
{
    public int PaymentId {get; set; }
    public int ReservationId {get; set; }
    public decimal Amount {get; set; }
    public DateTime PaymentDate {get; set; }
    public string Method {get; set; } = string.Empty;
    public string Status {get; set; } = string.Empty;
    public virtual Reservation Reservation { get; set; } = null!;
}