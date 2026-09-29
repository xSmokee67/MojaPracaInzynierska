using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class AmenityDto
{
    public int AmenityId {get; set; }
    [Required(ErrorMessage = "Nazwa udogodnienia jest wymagana.")]
    [StringLength(100, ErrorMessage = "Nazwa może mieć maksymalnie 100 znaków.")]
    public string Name {get; set; } = string.Empty;
}