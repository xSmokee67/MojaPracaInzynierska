using System;

namespace Model;

public class Invoice
{
    public int InvoiceId {get; set;}
    public int ReservationId {get; set; }
    public string InvoiceNumber {get; set; } = string.Empty;
    public DateTime IssueDate {get; set; }
    public decimal GrossAmount {get; set; }

    public virtual Reservation Reservation { get; set; } = null!;
}