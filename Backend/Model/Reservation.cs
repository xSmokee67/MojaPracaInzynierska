using System;
using System.Collections.Generic;

namespace Model;

public class Reservation
{
    public int ReservationId {get; set; }
    public int GuestId {get; set; }
    public int RoomId {get; set; }
    public DateTime CheckInDate {get; set; }
    public DateTime CheckOutDate {get; set; }
    public string Status {get; set; } = string.Empty;
    public decimal TotalPrice {get; set; }

    public virtual Guest Guest { get; set; } = null!;
    public virtual Room Room { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public virtual Invoice? Invoice { get; set; } = null!;
    public virtual ICollection<ReservationService> ReservationServices { get; set; } = new List<ReservationService>();
    public virtual Review? Review { get; set; } = null!;
}