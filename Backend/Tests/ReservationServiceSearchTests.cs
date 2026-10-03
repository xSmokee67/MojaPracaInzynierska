using Model;

namespace Tests;

// Testy wyszukiwarki na stronie głównej - ReservationService.SearchRoomTypesAsync
// Pokój Standardowy: pokoje 101 i 102, 200 zł/noc (w lipcu 2027 - 350 zł), max 2 osoby
// Apartament Premium: pokój 201, 500 zł/noc, max 4 osoby
public class ReservationServiceSearchTests
{
    private static readonly DateTime CheckIn = new DateTime(2027, 3, 10);
    private static readonly DateTime CheckOut = new DateTime(2027, 3, 13);

    [Fact(DisplayName = "Wyszukiwarka: zwraca każdy typ pokoju z liczbą wolnych pokoi i ceną całego pobytu")]
    public async Task ReturnsAvailabilityAndPriceForEachRoomType()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var results = await service.SearchRoomTypesAsync(CheckIn, CheckOut, 2);

        var standard = results.Single(r => r.RoomTypeId == TestData.StandardRoomTypeId);
        Assert.True(standard.IsAvailable);
        Assert.Equal(2, standard.AvailableRooms);
        Assert.Equal(3, standard.Nights);
        Assert.Equal(600m, standard.TotalPrice);

        var premium = results.Single(r => r.RoomTypeId == TestData.PremiumRoomTypeId);
        Assert.Equal(1, premium.AvailableRooms);
        Assert.Equal(1500m, premium.TotalPrice);
    }

    [Fact(DisplayName = "Wyszukiwarka: zajęte pokoje zmniejszają liczbę wolnych, a gdy brak wolnych - typ jest niedostępny")]
    public async Task CountsOnlyFreeRooms()
    {
        using var context = TestData.CreateContext();
        TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut);
        TestData.AddReservation(context, TestData.Room201Id, new DateTime(2027, 3, 12), new DateTime(2027, 3, 15));
        var service = TestData.CreateReservationService(context);

        var results = await service.SearchRoomTypesAsync(CheckIn, CheckOut, 2);

        var standard = results.Single(r => r.RoomTypeId == TestData.StandardRoomTypeId);
        Assert.True(standard.IsAvailable);
        Assert.Equal(1, standard.AvailableRooms);

        var premium = results.Single(r => r.RoomTypeId == TestData.PremiumRoomTypeId);
        Assert.False(premium.IsAvailable);
        Assert.Equal(0, premium.AvailableRooms);
    }

    [Fact(DisplayName = "Wyszukiwarka: blokady i pokoje wyłączone z użytku nie są liczone jako wolne")]
    public async Task IgnoresBlockedAndDisabledRooms()
    {
        using var context = TestData.CreateContext();
        context.RoomBlocks.Add(new RoomBlock { RoomId = TestData.Room101Id, OwnerId = 1, StartDate = CheckIn, EndDate = CheckOut, Reason = "remont" });
        context.Rooms.Single(r => r.RoomId == TestData.Room102Id).Status = "disabled";
        context.SaveChanges();
        var service = TestData.CreateReservationService(context);

        var results = await service.SearchRoomTypesAsync(CheckIn, CheckOut, 2);

        Assert.False(results.Single(r => r.RoomTypeId == TestData.StandardRoomTypeId).IsAvailable);
    }

    [Theory(DisplayName = "Wyszukiwarka: typ pokoju jest oznaczony jako za mały, gdy gości jest więcej niż miejsc")]
    [InlineData(1, true, true)]
    [InlineData(2, true, true)]
    [InlineData(3, false, true)]
    [InlineData(5, false, false)]
    public async Task MarksRoomTypesTooSmallForGuests(int guests, bool standardFits, bool premiumFits)
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var results = await service.SearchRoomTypesAsync(CheckIn, CheckOut, guests);

        Assert.Equal(standardFits, results.Single(r => r.RoomTypeId == TestData.StandardRoomTypeId).FitsGuests);
        Assert.Equal(premiumFits, results.Single(r => r.RoomTypeId == TestData.PremiumRoomTypeId).FitsGuests);
    }

    [Fact(DisplayName = "Wyszukiwarka: cena pobytu uwzględnia cennik sezonowy")]
    public async Task TotalPriceIncludesSeasonalPrices()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        // noce: 30.06 (200), 01.07 (350), 02.07 (350)
        var results = await service.SearchRoomTypesAsync(new DateTime(2027, 6, 30), new DateTime(2027, 7, 3), 2);

        Assert.Equal(900m, results.Single(r => r.RoomTypeId == TestData.StandardRoomTypeId).TotalPrice);
    }

    [Fact(DisplayName = "Dostępność: lista wolnych pokoi zawiera wszystkie wolne pokoje typu")]
    public async Task GetAvailableRoomIds_ReturnsAllFreeRooms()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var before = await service.GetAvailableRoomIdsAsync(TestData.StandardRoomTypeId, CheckIn, CheckOut);
        TestData.AddReservation(context, TestData.Room102Id, CheckIn, CheckOut);
        var after = await service.GetAvailableRoomIdsAsync(TestData.StandardRoomTypeId, CheckIn, CheckOut);

        Assert.Equal(new List<int> { TestData.Room101Id, TestData.Room102Id }, before.OrderBy(id => id).ToList());
        Assert.Equal(new List<int> { TestData.Room101Id }, after);
    }
}