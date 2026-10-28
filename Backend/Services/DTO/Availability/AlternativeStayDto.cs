namespace Services.DTO;

// Propozycja innego terminu tej samej długości, gdy w wybranym nie ma wolnego pokoju danego typu
public class AlternativeStayDto
{
    public DateTime CheckInDate {get; set; }
    public DateTime CheckOutDate {get; set; }
    public int AvailableRooms {get; set; }
    public decimal TotalPrice {get; set; }
}