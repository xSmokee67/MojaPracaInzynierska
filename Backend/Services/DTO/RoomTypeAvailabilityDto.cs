namespace Services.DTO;

// Wynik wyszukiwania na stronie głównej dla jednego typu pokoju w wybranym terminie
public class RoomTypeAvailabilityDto
{
    public int RoomTypeId {get; set; }
    public bool FitsGuests {get; set; }
    public bool IsAvailable {get; set; }
    public int AvailableRooms {get; set; }
    public int Nights {get; set; }
    public decimal TotalPrice {get; set; }
}