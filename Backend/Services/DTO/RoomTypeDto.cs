namespace Services.DTO;

public class RoomTypeDto
{
    public int RoomTypeId {get; set; }
    public string Name {get; set; } = string.Empty;
    public decimal BasePrice {get; set;}
    public int MaxOccupancy {get; set; }
}