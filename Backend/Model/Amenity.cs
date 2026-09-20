using System.Collections.Generic;

namespace Model;

public class Amenity
{
    public int AmenityId {get; set;}
    public string Name {get; set; } = string.Empty;

    public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
}

