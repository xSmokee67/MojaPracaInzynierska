using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class RoomBlockDto
{
    public int RoomBlockId {get; set; }
    [Range(1, int.MaxValue, ErrorMessage = "Wybierz pokój.")]
    public int RoomId {get; set; }
    public string RoomNumber {get; set; } = string.Empty;
    public int OwnerId {get; set; }
    public string OwnerName {get; set; } = string.Empty;
    public DateTime StartDate {get; set; }
    public DateTime EndDate {get; set; }
    [Required(ErrorMessage = "Podaj powód blokady.")]
    [StringLength(200, ErrorMessage = "Powód może mieć maksymalnie 200 znaków.")]
    public string Reason {get; set; } = string.Empty;
}