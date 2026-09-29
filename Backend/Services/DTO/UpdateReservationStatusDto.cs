using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class UpdateReservationStatusDto
{
    [Required(ErrorMessage = "Status rezerwacji jest wymagany.")]
    public string Status {get; set; } = string.Empty;
}