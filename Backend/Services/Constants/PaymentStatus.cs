namespace Services.Constants;

// Statusy płatności zapisywane w kolumnie Payments.Status
public static class PaymentStatus
{
    public const string Pending = "pending";
    public const string Completed = "completed";
    public const string Failed = "failed";
    public const string Refunded = "refunded";

    public static readonly string[] All = { Pending, Completed, Failed, Refunded };
}