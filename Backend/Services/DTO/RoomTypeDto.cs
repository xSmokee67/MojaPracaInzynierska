using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class RoomTypeDto
{
    public int RoomTypeId {get; set; }
    [Required(ErrorMessage = "Nazwa typu pokoju jest wymagana.")]
    [StringLength(100, ErrorMessage = "Nazwa może mieć maksymalnie 100 znaków.")]
    public string Name {get; set; } = string.Empty;
    [Range(0.01, 100000, ErrorMessage = "Cena bazowa musi mieścić się w zakresie 0,01 - 100 000 PLN.")]
    public decimal BasePrice {get; set;}
    [Range(1, 20, ErrorMessage = "Maksymalna liczba gości musi mieścić się w zakresie 1 - 20.")]
    public int MaxOccupancy {get; set; }
}