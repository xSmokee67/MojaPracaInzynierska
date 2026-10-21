namespace Services.DTO;

// Jedna noc pokoju w kalendarzu dostępności: wolna, zarezerwowana (z numerem rezerwacji) albo zablokowana (z powodem)
public class AvailabilityDayDto
{
    public DateTime Date {get; set; }
    public string Status {get; set; } = string.Empty;
    public int? ReservationId {get; set; }
    public string? ReservationStatus {get; set; }
    public string? GuestName {get; set; }
    public string? BlockReason {get; set; }
}