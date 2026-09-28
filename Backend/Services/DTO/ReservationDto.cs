namespace Services.DTO;

public class ReservationDto
{
    public int ReservationId {get; set; }
    public int GuestId {get; set; }
    public string GuestName {get; set; } = string.Empty;
    public string GuestEmail {get; set; } = string.Empty;
    public int RoomId {get; set; }
    public string RoomNumber {get; set; } = string.Empty;
    public string RoomTypeName {get; set; } = string.Empty;
    public DateTime CheckInDate {get; set; }
    public DateTime CheckOutDate {get; set; }
    public string Status {get; set; } = string.Empty;
    public decimal TotalPrice {get; set; }
    public List<string> AdditionalServices {get; set; } = new ();
}