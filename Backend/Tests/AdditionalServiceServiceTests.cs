using Microsoft.EntityFrameworkCore;
using Services.DTO;

namespace Tests;

// Testy usług dodatkowych w panelu właściciela - AdditionalServiceService (sposób naliczania)
public class AdditionalServiceServiceTests
{
    [Fact(DisplayName = "Usługi: nowa usługa zapisuje sposób naliczania")]
    public async Task Create_SavesChargeType()
    {
        using var context = TestData.CreateContext();
        var service = new Services.Services.AdditionalServiceService(context);

        await service.CreateAdditionalServiceAsync(new AdditionalServiceDto { Name = "Transfer z lotniska", Price = 120, ChargeType = "per-stay" });

        var saved = await context.AdditionalServices.SingleAsync(s => s.Name == "Transfer z lotniska");
        Assert.Equal("per-stay", saved.ChargeType);
    }

    [Fact(DisplayName = "Usługi: nieznany sposób naliczania jest odrzucany")]
    public async Task Create_Throws_ForUnknownChargeType()
    {
        using var context = TestData.CreateContext();
        var service = new Services.Services.AdditionalServiceService(context);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAdditionalServiceAsync(new AdditionalServiceDto { Name = "Sprzątanie", Price = 40, ChargeType = "per-week" }));

        Assert.Equal(2, await context.AdditionalServices.CountAsync());
    }

    [Fact(DisplayName = "Usługi: usługi zamówionej w rezerwacji nie można usunąć (historia rozliczeń)")]
    public async Task Delete_Throws_WhenServiceUsedInReservation()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, DateTime.Today.AddDays(10), DateTime.Today.AddDays(12), status: "completed");
        context.ReservationServices.Add(new Model.ReservationService { ReservationId = reservation.ReservationId, ServiceId = TestData.BreakfastId, Quantity = 4, ChargeType = "per-person-per-night", TotalPrice = 200 });
        context.SaveChanges();
        var service = new Services.Services.AdditionalServiceService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteAdditionalServiceAsync(TestData.BreakfastId));

        Assert.NotNull(await context.AdditionalServices.FindAsync(TestData.BreakfastId));
        Assert.Equal(1, await context.ReservationServices.CountAsync());
    }

    [Fact(DisplayName = "Usługi: niezamawianą usługę można usunąć")]
    public async Task Delete_RemovesUnusedService()
    {
        using var context = TestData.CreateContext();
        var service = new Services.Services.AdditionalServiceService(context);

        Assert.True(await service.DeleteAdditionalServiceAsync(TestData.ParkingId));

        Assert.Null(await context.AdditionalServices.FindAsync(TestData.ParkingId));
    }

    [Fact(DisplayName = "Usługi: usługi wycofanej z oferty nie można zamówić w nowej rezerwacji")]
    public async Task WithdrawnService_CannotBeOrdered()
    {
        using var context = TestData.CreateContext();
        (await context.AdditionalServices.FindAsync(TestData.BreakfastId))!.IsActive = false;
        context.SaveChanges();
        var reservations = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => reservations.CalculateTotalPriceAsync(TestData.StandardRoomTypeId,
            DateTime.Today.AddDays(10), DateTime.Today.AddDays(12), new List<int> { TestData.BreakfastId }, numberOfGuests: 2));
    }
}
