namespace Services.Validation;

// Zasady anulowania rezerwacji przez gościa:
// - do FreeCancellationDays dni przed przyjazdem (włącznie) - bezpłatnie, hotel zwraca całą wpłatę,
// - później (najpóźniej dzień przed przyjazdem) - hotel zatrzymuje LateCancellationFeeRate ceny pobytu z wpłaconej kwoty.
// Hotel nie zatrzymuje więcej, niż gość wpłacił (nie ma jak pobrać dopłaty). Rezerwacja anulowana przez hotel
// albo automatycznie (brak wpłaty w terminie) zawsze jest zwracana w całości.
public static class CancellationPolicy
{
    public const int FreeCancellationDays = 7;
    public const decimal LateCancellationFeeRate = 0.30m;

    // Ostatni dzień bezpłatnego anulowania
    public static DateTime FreeCancellationUntil(DateTime checkIn) => checkIn.Date.AddDays(-FreeCancellationDays);

    // Opłata, którą hotel zatrzymuje przy anulowaniu przez gościa w dniu "today"
    public static decimal Fee(DateTime checkIn, decimal totalPrice, decimal paidAmount, DateTime today)
    {
        if (today.Date <= FreeCancellationUntil(checkIn))
        {
            return 0;
        }

        var fee = Math.Round(totalPrice * LateCancellationFeeRate, 2, MidpointRounding.AwayFromZero);
        return Math.Max(0, Math.Min(fee, paidAmount));
    }
}
