using System;

namespace Model;

public class ReservationService
{
    public int ReservationId {get; set; }
    public int ServiceId {get; set; }
    public int Quantity {get; set; }
    public decimal TotalPrice {get; set; }

    public virtual Reservation Reservation { get; set; } = null!;
    public virtual AdditionalService AdditionalService { get; set; } = null!;
}