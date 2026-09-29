using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class ReviewDto
{
    public int ReviewId {get; set; }
    public int GuestId {get; set; }
    public string GuestName {get; set; } = string.Empty;
    [Range(1, int.MaxValue, ErrorMessage = "Nie wskazano rezerwacji.")]
    public int ReservationId {get; set; }
    public string RoomTypeName {get; set; } = string.Empty;
    [Range(1, 5, ErrorMessage = "Ocena musi mieścić się w zakresie 1-5.")]
    public int Rating {get; set; }
    [StringLength(500, ErrorMessage = "Komentarz może mieć maksymalnie 500 znaków.")]
    public string Comment {get; set; } = string.Empty;
    public DateTime Date {get; set; }
}