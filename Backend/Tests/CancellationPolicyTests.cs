using Microsoft.EntityFrameworkCore;
using Services.DTO;
using Services.Validation;

namespace Tests;

// Testy polityki anulowania (CancellationPolicy): bezpłatnie do 7 dni przed przyjazdem, później hotel zatrzymuje
// 30% ceny pobytu z wpłaconej kwoty; anulowanie przez hotel zawsze z pełnym zwrotem
public class CancellationPolicyTests
{
    private static readonly DateTime Today = DateTime.Today;

    [Theory(DisplayName = "Anulowanie: opłata zależy od liczby dni do przyjazdu i nie przekracza wpłaconej kwoty")]
    [InlineData(10, 600, 600, 0)]   // ponad tydzień przed przyjazdem - bezpłatnie
    [InlineData(7, 600, 600, 0)]    // dokładnie 7 dni przed - jeszcze bezpłatnie
    [InlineData(6, 600, 600, 180)]  // 6 dni przed - 30% ceny
    [InlineData(2, 600, 100, 100)]  // wpłacono mniej niż opłata - hotel zatrzymuje tylko wpłatę
    [InlineData(2, 600, 0, 0)]      // brak wpłat - nic do zatrzymania
    public void Fee_FollowsPolicy(int daysToArrival, int totalPrice, int paid, int expectedFee)
    {
        var fee = CancellationPolicy.Fee(Today.AddDays(daysToArrival), totalPrice, paid, Today);

        Assert.Equal(expectedFee, fee);
    }

    // Potwierdzona rezerwacja za 600 zł, opłacona w całości
    private static Model.Reservation PaidReservation(DAL.ApplicationDbContext db, int daysToArrival)
    {
        var reservation = TestData.AddReservation(db, TestData.Room101Id, Today.AddDays(daysToArrival), Today.AddDays(daysToArrival + 3), totalPrice: 600);
        db.Payments.Add(new Model.Payment { ReservationId = reservation.ReservationId, Amount = 600, Method = "card", Status = "completed", PaymentDate = DateTime.UtcNow });
        db.SaveChanges();
        return reservation;
    }

    [Fact(DisplayName = "Anulowanie: gość anuluje wcześnie - bez opłaty, hotel może zwrócić całą wpłatę")]
    public async Task GuestCancelsEarly_FullRefund()
    {
        using var db = TestData.CreateContext();
        var reservation = PaidReservation(db, daysToArrival: 10);
        var service = TestData.CreateReservationService(db);

        await service.CancelReservationByGuestAsync(reservation.ReservationId, TestData.GuestId);

        Assert.Equal(0m, (await db.Reservations.FindAsync(reservation.ReservationId))!.CancellationFee);
        Assert.True(await service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = 600, Method = "transfer", Status = "refunded" }));
    }

    [Fact(DisplayName = "Anulowanie: gość anuluje później niż 7 dni przed przyjazdem - hotel zatrzymuje 30%, zwrot ograniczony do reszty")]
    public async Task GuestCancelsLate_FeeKept()
    {
        using var db = TestData.CreateContext();
        var reservation = PaidReservation(db, daysToArrival: 3);
        var service = TestData.CreateReservationService(db);

        await service.CancelReservationByGuestAsync(reservation.ReservationId, TestData.GuestId);

        var cancelled = (await db.Reservations.FindAsync(reservation.ReservationId))!;
        Assert.Equal("cancelled", cancelled.Status);
        Assert.Equal(180m, cancelled.CancellationFee);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = 421, Method = "transfer", Status = "refunded" }));
        Assert.True(await service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = 420, Method = "transfer", Status = "refunded" }));
    }

    [Fact(DisplayName = "Anulowanie: hotel anuluje tuż przed przyjazdem - bez opłaty, pełny zwrot")]
    public async Task OwnerCancels_NoFee()
    {
        using var db = TestData.CreateContext();
        var reservation = PaidReservation(db, daysToArrival: 2);
        var service = TestData.CreateReservationService(db);

        await service.UpdateReservationStatusAsync(reservation.ReservationId, "cancelled");

        Assert.Equal(0m, (await db.Reservations.FindAsync(reservation.ReservationId))!.CancellationFee);
        Assert.True(await service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = 600, Method = "transfer", Status = "refunded" }));
        Assert.Equal(1, await db.Payments.CountAsync(p => p.Status == "refunded"));
    }
}
