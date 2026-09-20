using System;

namespace Model;

public class Availability
{
    public int AvailabilityId { get; set; }
    public int RoomId { get; set; }
    public DateTime Date { get; set; }
    public string Status { get; set; } = string.Empty;

    public virtual Room Room { get; set; } = null!;
}