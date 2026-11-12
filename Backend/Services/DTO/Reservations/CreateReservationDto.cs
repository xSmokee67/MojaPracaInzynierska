using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

public class CreateReservationDto
{
    public int GuestId { get; set; }
    [Range(1, int.MaxValue, ErrorMessage = "Wybierz typ pokoju.")]
    public int RoomTypeId {get; set; }
    public DateTime CheckInDate {get; set; }
    public DateTime CheckOutDate {get; set; }
    // Liczba gości wpływa na cenę usług naliczanych za osobę (np. śniadanie), więc jest potrzebna także przy wyliczaniu ceny (POST /price).
    // Górny limit (MaxOccupancy typu pokoju) sprawdza ReservationService.CreateReservationAsync.
    [Range(1, 20, ErrorMessage = "Podaj liczbę gości (1 - 20).")]
    public int NumberOfGuests {get; set; }
    public List<int> AdditionalServiceIds {get; set; } = new ();
}