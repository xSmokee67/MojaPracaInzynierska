using Microsoft.EntityFrameworkCore;
using Services.DTO;

namespace Tests;

// Testy terminu płatności i automatycznych statusów zależnych od wpłat:
// termin = 3 dni od rezerwacji (najpóźniej dzień przed przyjazdem), wpłata całości potwierdza rezerwację,
// nieopłacona po terminie zostaje anulowana (ReservationService.UpdateExpiredReservationsAsync)
public class ReservationPaymentTests
{
    // Daty względem dzisiejszego dnia - zadanie w tle porównuje terminy z DateTime.Today
    private static readonly DateTime Today = DateTime.Today;

    [Theory(DisplayName = "Termin płatności: 3 dni od rezerwacji, najpóźniej dzień przed przyjazdem, nie wcześniej niż dziś")]
    [InlineData(10, 3)] // przyjazd za 10 dni - 3 dni na wpłatę
    [InlineData(3, 2)]  // przyjazd za 3 dni - wpłata do dnia przed przyjazdem
    [InlineData(1, 0)]  // przyjazd jutro - wpłata do końca dzisiejszego dnia
    [InlineData(0, 0)]  // przyjazd dziś - wpłata do końca dzisiejszego dnia
    public void PaymentDeadline_FollowsRule(int daysToArrival, int expectedDaysToDeadline)
    {
        var today = new DateTime(2027, 3, 1);

        var deadline = Services.Services.ReservationService.PaymentDeadlineFor(today.AddDays(daysToArrival), today);

        Assert.Equal(today.AddDays(expectedDaysToDeadline), deadline);
    }

    [Fact(DisplayName = "Termin płatności: nowa rezerwacja dostaje termin 3 dni od dziś")]
    public async Task CreateReservation_SetsPaymentDeadline()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        await service.CreateReservationAsync(new CreateReservationDto
        {
            GuestId = TestData.GuestId,
            RoomTypeId = TestData.StandardRoomTypeId,
            CheckInDate = Today.AddDays(10),
            CheckOutDate = Today.AddDays(12),
            NumberOfGuests = 2
        });

        var reservation = await context.Reservations.SingleAsync();
        Assert.Equal("pending", reservation.Status);
        Assert.Equal(Today.AddDays(3), reservation.PaymentDeadline);
    }

    [Fact(DisplayName = "Płatność: wpłata całej kwoty automatycznie potwierdza oczekującą rezerwację")]
    public async Task RegisterPayment_FullAmount_ConfirmsReservation()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, Today.AddDays(10), Today.AddDays(13), status: "pending", totalPrice: 600);
        var service = TestData.CreateReservationService(context);

        await service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = 200, Method = "card" });
        Assert.Equal("pending", (await context.Reservations.FindAsync(reservation.ReservationId))!.Status); // część kwoty - nadal oczekuje

        await service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = 400, Method = "transfer" });
        Assert.Equal("confirmed", (await context.Reservations.FindAsync(reservation.ReservationId))!.Status);
    }

    [Fact(DisplayName = "Automat: nieopłacona rezerwacja po terminie płatności zostaje anulowana i zwalnia pokój")]
    public async Task UpdateExpired_CancelsUnpaidReservationAfterDeadline()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room201Id, Today.AddDays(5), Today.AddDays(7), status: "pending", totalPrice: 1000);
        reservation.PaymentDeadline = Today.AddDays(-1);
        context.SaveChanges();
        var service = TestData.CreateReservationService(context);

        var changed = await service.UpdateExpiredReservationsAsync();

        Assert.Equal(1, changed);
        Assert.Equal("cancelled", (await context.Reservations.FindAsync(reservation.ReservationId))!.Status);
        Assert.Equal(TestData.Room201Id, await new Services.Services.AvailabilityService(context).GetAvailableRoomIdAsync(TestData.PremiumRoomTypeId, Today.AddDays(5), Today.AddDays(7)));
    }

    [Fact(DisplayName = "Automat: w dniu terminu płatności rezerwacja jeszcze nie jest anulowana")]
    public async Task UpdateExpired_KeepsReservationOnDeadlineDay()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room201Id, Today.AddDays(5), Today.AddDays(7), status: "pending", totalPrice: 1000);
        reservation.PaymentDeadline = Today;
        context.SaveChanges();
        var service = TestData.CreateReservationService(context);

        await service.UpdateExpiredReservationsAsync();

        Assert.Equal("pending", (await context.Reservations.FindAsync(reservation.ReservationId))!.Status);
    }

    [Fact(DisplayName = "Automat: rezerwacja opłacona w całości po terminie zostaje potwierdzona, nie anulowana")]
    public async Task UpdateExpired_ConfirmsPaidReservation()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room201Id, Today.AddDays(5), Today.AddDays(7), status: "pending", totalPrice: 1000);
        reservation.PaymentDeadline = Today.AddDays(-1);
        context.Payments.Add(new Model.Payment { ReservationId = reservation.ReservationId, Amount = 1000, Method = "cash", Status = "completed", PaymentDate = DateTime.UtcNow });
        context.SaveChanges();
        var service = TestData.CreateReservationService(context);

        await service.UpdateExpiredReservationsAsync();

        Assert.Equal("confirmed", (await context.Reservations.FindAsync(reservation.ReservationId))!.Status);
    }

    [Fact(DisplayName = "Automat: potwierdzona rezerwacja po dniu wymeldowania staje się zrealizowana")]
    public async Task UpdateExpired_CompletesConfirmedReservationAfterCheckOut()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, Today.AddDays(-4), Today.AddDays(-1), status: "confirmed");
        var service = TestData.CreateReservationService(context);

        await service.UpdateExpiredReservationsAsync();

        Assert.Equal("completed", (await context.Reservations.FindAsync(reservation.ReservationId))!.Status);
    }
}
