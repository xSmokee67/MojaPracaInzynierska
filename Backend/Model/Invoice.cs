using System;

namespace Model;

public class Invoice
{
    public int InvoiceId {get; set;}
    public int ReservationId {get; set; }
    // Numer w serii miesiąca: FV/rrrr/mm/nnnnn, gdzie nnnnn to kolejny numer faktury w tym miesiącu (SequenceNumber)
    public string InvoiceNumber {get; set; } = string.Empty;
    public int SequenceNumber {get; set; }
    public DateTime IssueDate {get; set; }
    public decimal GrossAmount {get; set; }

    public virtual Reservation Reservation { get; set; } = null!;
}