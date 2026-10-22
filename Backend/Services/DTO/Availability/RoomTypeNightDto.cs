namespace Services.DTO;

// Kalendarz typu pokoju dla gościa (strona pokoju): ile pokoi tego typu jest wolnych w danej nocy - bez danych o rezerwacjach
public class RoomTypeNightDto
{
    public DateTime Date {get; set; }
    public int AvailableRooms {get; set; }
}