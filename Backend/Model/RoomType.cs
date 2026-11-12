using System.Collections.Generic;

namespace Model;

public class RoomType
{
    public int RoomTypeId {get; set; }
    public string Name {get; set; } = string.Empty;
    public string Description {get; set; } = string.Empty;
    public decimal BasePrice {get; set; }
    public int MaxOccupancy {get; set; }
    // Powierzchnia pokoju w m² (pokazywana na karcie i w profilu typu pokoju)
    public int Area {get; set; }

    public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
    public virtual ICollection<PriceListEntry> PriceListEntries { get; set; } = new List<PriceListEntry>();
    public virtual ICollection<RoomTypePhoto> Photos { get; set; } = new List<RoomTypePhoto>();
}