namespace Services.DTO;

// Kalendarz dostępności w panelu właściciela: jeden wiersz = jeden pokój, Days = kolejne noce z wybranego zakresu
public class RoomAvailabilityDto
{
    public int RoomId {get; set; }
    public string RoomNumber {get; set; } = string.Empty;
    public string RoomTypeName {get; set; } = string.Empty;
    public string RoomStatus {get; set; } = string.Empty;
    public List<AvailabilityDayDto> Days {get; set; } = new ();
}