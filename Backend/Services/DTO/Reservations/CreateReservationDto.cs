using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class CreateReservationDto
{
    public int GuestId { get; set; }
    [Range(1, int.MaxValue, ErrorMessage = "Wybierz typ pokoju.")]
    public int RoomTypeId {get; set; }
    public DateTime CheckInDate {get; set; }
    public DateTime CheckOutDate {get; set; }
    public List<int> AdditionalServiceIds {get; set; } = new ();
}