namespace Services.DTO;

public class CreateReservationDto
{
    public int GuestId { get; set; }
    public int RoomTypeId {get; set; }
    public DateTime CheckInDate {get; set; }
    public DateTime CheckOutDate {get; set; }
    public List<int> AdditionalServiceIds {get; set; } = new ();
}