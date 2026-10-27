namespace Services.DTO;

// Zmiana terminu istniejącej rezerwacji (gość - własnej, właściciel - dowolnej)
public class ChangeReservationDatesDto
{
    public DateTime CheckInDate {get; set; }
    public DateTime CheckOutDate {get; set; }
}