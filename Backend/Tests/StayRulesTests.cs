using Microsoft.EntityFrameworkCore;
using Services.DTO;
using Services.Validation;

namespace Tests;

// Testy wspólnej reguły terminu pobytu (StayRules): przyjazd nie w przeszłości i przed wyjazdem, maksymalnie 60 nocy.
// Tej samej reguły używają endpointy dostępności, wyszukiwarki, ceny i tworzenia rezerwacji oraz serwis rezerwacji.
public class StayRulesTests
{
    private static readonly DateTime Today = DateTime.Today;

    [Theory(DisplayName = "Termin pobytu: poprawne i niepoprawne terminy (dni względem dzisiaj)")]
    [InlineData(1, 3, null)]       // zwykły pobyt
    [InlineData(0, 1, null)]       // przyjazd dziś
    [InlineData(1, 61, null)]      // dokładnie 60 nocy
    [InlineData(1, 62, "long")]    // 61 nocy
    [InlineData(-1, 2, "dates")]   // przyjazd w przeszłości
    [InlineData(3, 3, "dates")]    // przyjazd = wyjazd
    [InlineData(5, 2, "dates")]    // wyjazd przed przyjazdem
    public void Validate_ReturnsExpectedError(int checkInOffset, int checkOutOffset, string? expected)
    {
        var error = StayRules.Validate(Today.AddDays(checkInOffset), Today.AddDays(checkOutOffset));

        var expectedMessage = expected switch
        {
            "long" => StayRules.TooLongMessage,
            "dates" => StayRules.InvalidDatesMessage,
            _ => null
        };
        Assert.Equal(expectedMessage, error);
    }

    [Fact(DisplayName = "Termin pobytu: serwis odrzuca rezerwację dłuższą niż 60 nocy i niczego nie zapisuje")]
    public async Task CreateReservation_Throws_ForStayLongerThanLimit()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateReservationAsync(new CreateReservationDto
        {
            GuestId = TestData.GuestId,
            RoomTypeId = TestData.StandardRoomTypeId,
            CheckInDate = Today.AddDays(10),
            CheckOutDate = Today.AddDays(71),
            NumberOfGuests = 1
        }));

        Assert.Equal(StayRules.TooLongMessage, exception.Message);
        Assert.Equal(0, await context.Reservations.CountAsync());
    }

    [Fact(DisplayName = "Termin pobytu: serwis odrzuca rezerwację z przyjazdem w przeszłości")]
    public async Task CreateReservation_Throws_ForPastCheckIn()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateReservationAsync(new CreateReservationDto
        {
            GuestId = TestData.GuestId,
            RoomTypeId = TestData.StandardRoomTypeId,
            CheckInDate = Today.AddDays(-2),
            CheckOutDate = Today.AddDays(1),
            NumberOfGuests = 1
        }));

        Assert.Equal(0, await context.Reservations.CountAsync());
    }

    [Fact(DisplayName = "Termin pobytu: zmiana terminu na pobyt dłuższy niż 60 nocy jest odrzucana")]
    public async Task ChangeDates_Throws_ForStayLongerThanLimit()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, Today.AddDays(10), Today.AddDays(12), status: "confirmed");
        var service = TestData.CreateReservationService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.ChangeReservationDatesAsync(reservation.ReservationId,
            new ChangeReservationDatesDto { CheckInDate = Today.AddDays(10), CheckOutDate = Today.AddDays(71) }, null));

        Assert.Equal(StayRules.TooLongMessage, exception.Message);
    }
}
