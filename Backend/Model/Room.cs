using System.Collections.Generic;

namespace Model;

public class Room
{
    public int RoomId {get; set; }
    public int RoomTypeId {get; set; }
    public string RoomNumber {get; set; } = string.Empty;
    public string Status {get; set; } = string.Empty;

    public virtual RoomType RoomType { get; set; } = null!;
    public virtual ICollection<Availability> Availabilities { get; set; } = new List<Availability>();
    public virtual ICollection<RoomBlock> RoomBlocks { get; set; } = new List<RoomBlock>();
    public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    public virtual ICollection<Amenity> Amenities { get; set; } = new List<Amenity>();
}