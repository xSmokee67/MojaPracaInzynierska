namespace Services.Constants;

// Metody płatności zapisywane w kolumnie Payments.Method
public static class PaymentMethod
{
    public const string Card = "card";
    public const string Transfer = "transfer";
    public const string Cash = "cash";
    public const string Blik = "BLIK";

    public static readonly string[] All = { Card, Transfer, Cash, Blik };
}