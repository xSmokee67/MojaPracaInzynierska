using System;

namespace Model;

public class ReservationService
{
    public int ReservationId {get; set; }
    public int ServiceId {get; set; }
    // Ile razy usługa została doliczona (np. śniadanie: osoby × noce) i sposób naliczania z chwili rezerwacji
    public int Quantity {get; set; }
    public string ChargeType {get; set; } = string.Empty;
    public decimal TotalPrice {get; set; }

    public virtual Reservation Reservation { get; set; } = null!;
    public virtual AdditionalService AdditionalService { get; set; } = null!;
}