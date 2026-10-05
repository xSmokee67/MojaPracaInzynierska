namespace Services.Constants;

// Statusy rezerwacji zapisywane w kolumnie Reservations.Status
public static class ReservationStatus
{
    public const string Pending = "pending";
    public const string Confirmed = "confirmed";
    public const string Cancelled = "cancelled";
    public const string Completed = "completed";
    public const string NoShow = "no-show";

    public static readonly string[] All = { Pending, Confirmed, Cancelled, Completed, NoShow };
}