using System;
using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class PriceListEntryDto
{
    public int PriceListEntryId {get; set;}
    [Range(1, int.MaxValue, ErrorMessage = "Wybierz typ pokoju.")]
    public int RoomTypeId {get; set;}
    public string RoomTypeName {get; set; } = string.Empty;
    public DateTime StartDate {get; set; }
    public DateTime EndDate {get; set;}
    [Range(0.01, 100000, ErrorMessage = "Cena za noc musi mieścić się w zakresie 0,01 - 100 000 PLN.")]
    public decimal PricePerNight {get; set; }

}