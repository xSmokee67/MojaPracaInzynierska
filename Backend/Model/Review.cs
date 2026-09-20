using System;

namespace Model;

public class Review
{
    public int ReviewId { get; set; }
    public int GuestId { get; set; }
    public int ReservationId { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime Date { get; set; }

    public virtual Guest Guest { get; set; } = null!;
    public virtual Reservation Reservation { get; set; } = null!;
}