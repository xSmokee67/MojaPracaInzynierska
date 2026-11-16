namespace Services.Validation;

// Wspólna reguła terminu pobytu - używają jej wszystkie endpointy rezerwacji (dostępność, inne terminy, wyszukiwarka,
// cena, utworzenie rezerwacji) i serwis rezerwacji, więc w każdym miejscu obowiązuje ten sam limit i te same komunikaty.
public static class StayRules
{
    // Najdłuższy pobyt, jaki można zarezerwować jednym zamówieniem
    public const int MaxNights = 60;

    public const string InvalidDatesMessage = "Nieprawidłowy termin pobytu - data przyjazdu nie może być w przeszłości i musi poprzedzać datę wyjazdu.";
    public static readonly string TooLongMessage = $"Pobyt może trwać maksymalnie {MaxNights} nocy.";

    // Zwraca komunikat błędu albo null, gdy termin jest poprawny
    public static string? Validate(DateTime checkIn, DateTime checkOut)
    {
        if (checkIn.Date >= checkOut.Date || checkIn.Date < DateTime.Today)
        {
            return InvalidDatesMessage;
        }

        if ((checkOut.Date - checkIn.Date).Days > MaxNights)
        {
            return TooLongMessage;
        }

        return null;
    }

    // Wersja dla serwisów - rzuca ArgumentException (kontrolery zamieniają go na 400)
    public static void EnsureValid(DateTime checkIn, DateTime checkOut)
    {
        var error = Validate(checkIn, checkOut);
        if (error != null)
        {
            throw new ArgumentException(error);
        }
    }
}
