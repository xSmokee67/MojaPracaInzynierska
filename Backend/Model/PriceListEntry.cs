using System;

namespace Model;

public class PriceListEntry
{
    public int PriceListEntryId {get; set; }
    public int RoomTypeId {get; set;}
    public DateTime StartDate {get; set; }
    public DateTime EndDate {get; set; }
    public decimal PricePerNight {get; set; }

    public virtual RoomType RoomType { get; set; } = null!;
}