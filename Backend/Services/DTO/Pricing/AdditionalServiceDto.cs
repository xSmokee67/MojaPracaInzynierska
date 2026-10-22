using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class AdditionalServiceDto
{
    public int ServiceId {get; set;}
    [Required(ErrorMessage = "Nazwa usługi jest wymagana.")]
    [StringLength(100, ErrorMessage = "Nazwa może mieć maksymalnie 100 znaków.")]
    public string Name {get; set; } = string.Empty;
    [Range(0.01, 100000, ErrorMessage = "Cena usługi musi mieścić się w zakresie 0,01 - 100 000 PLN.")]
    public decimal Price {get; set; }
}