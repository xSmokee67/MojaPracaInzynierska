namespace Services.DTO;

public class ReviewDto
{
    public int ReviewId {get; set; }
    public int GuestId {get; set; }
    public string GuestName {get; set; } = string.Empty;
    public int ReservationId {get; set; }
    public string RoomTypeName {get; set; } = string.Empty;
    public int Rating {get; set; }
    public string Comment {get; set; } = string.Empty;
    public DateTime Date {get; set; }
}