namespace Services.Constants;

// Sposób naliczania usługi dodatkowej - kolumny AdditionalServices.ChargeType i ReservationServices.ChargeType
public static class ServiceChargeType
{
    public const string PerStay = "per-stay";                       // raz za cały pobyt (np. transfer z lotniska)
    public const string PerNight = "per-night";                     // za każdą noc (np. parking)
    public const string PerPerson = "per-person";                   // raz za każdą osobę (np. pakiet powitalny)
    public const string PerPersonPerNight = "per-person-per-night"; // za każdą osobę i każdą noc (np. śniadanie)

    public static readonly string[] All = { PerStay, PerNight, PerPerson, PerPersonPerNight };

    // Ile razy usługa jest doliczana do pobytu, np. śniadanie dla 4 osób na 2 noce = 8
    public static int Quantity(string chargeType, int nights, int guests) => chargeType switch
    {
        PerNight => nights,
        PerPerson => guests,
        PerPersonPerNight => nights * guests,
        _ => 1
    };
}
