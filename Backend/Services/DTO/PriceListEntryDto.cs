using System;

namespace Services.DTO;

public class PriceListEntryDto
{
    public int PriceListEntryId {get; set;}
    public int RoomTypeId {get; set;}
    public string RoomTypeName {get; set; } = string.Empty;
    public DateTime StartDate {get; set; }
    public DateTime EndDate {get; set;}
    public decimal PricePerNight {get; set; }

}