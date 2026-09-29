using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class RoomDto
{
    public int RoomId {get; set;}
    [Range(1, int.MaxValue, ErrorMessage = "Wybierz typ pokoju.")]
    public int RoomTypeId {get; set;}
    public string RoomTypeName {get; set; } = string.Empty;
    [Required(ErrorMessage = "Numer pokoju jest wymagany.")]
    [StringLength(10, ErrorMessage = "Numer pokoju może mieć maksymalnie 10 znaków.")]
    public string RoomNumber {get; set; } = string.Empty;
    [RegularExpression("^(available|cleaning|maintenance|disabled)?$", ErrorMessage = "Nieprawidłowy status pokoju.")]
    public string Status {get; set; } = string.Empty;
    public List<int> AmenityIds {get; set; } = new ();
    public List<string> AmenityNames {get; set; } = new ();
}