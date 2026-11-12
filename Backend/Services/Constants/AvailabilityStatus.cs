namespace Services.Constants;

// Statusy nocy w kalendarzu dostępności - wyliczane na bieżąco z rezerwacji i blokad (AvailabilityService.GetCalendarAsync)
public static class AvailabilityStatus
{
    public const string Free = "free";
    public const string Booked = "booked";
    public const string Blocked = "blocked";
}