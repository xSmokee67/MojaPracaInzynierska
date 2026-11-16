namespace Services.Constants;

// Statusy płatności zapisywane w kolumnie Payments.Status.
// Hotel zapisuje w systemie pieniądze, które już otrzymał (przelew, wpłata w recepcji) albo oddał gościowi -
// nie ma płatności "w toku", więc są tylko dwa rodzaje wpisu: wpłata i zwrot
public static class PaymentStatus
{
    public const string Completed = "completed";
    public const string Refunded = "refunded";

    public static readonly string[] All = { Completed, Refunded };
}
