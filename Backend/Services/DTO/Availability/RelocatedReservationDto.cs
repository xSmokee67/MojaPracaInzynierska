namespace Services.DTO;

// Rezerwacja przeniesiona do innego pokoju tego samego typu (remont, wyłączenie pokoju, blokada, zmiana typu pokoju)
public class RelocatedReservationDto
{
    public int ReservationId {get; set; }
    public int GuestId {get; set; }
    public DateTime CheckInDate {get; set; }
    public DateTime CheckOutDate {get; set; }
    public string FromRoomNumber {get; set; } = string.Empty;
    public string ToRoomNumber {get; set; } = string.Empty;
}