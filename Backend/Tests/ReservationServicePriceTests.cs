namespace Tests;

// Testy wyliczania ceny rezerwacji - ReservationService.CalculateTotalPriceAsync
// Cena bazowa pokoju standardowego: 200 zł/noc, w lipcu 2027 (cennik sezonowy): 350 zł/noc
// Usługi dodatkowe: śniadanie 50 zł za osobę za noc, parking 30 zł za noc
public class ReservationServicePriceTests
{
    [Fact(DisplayName = "Cena: poza sezonem liczona jest cena bazowa za każdą noc")]
    public async Task UsesBasePrice_OutsideSeason()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var price = await service.CalculateTotalPriceAsync(TestData.StandardRoomTypeId, new DateTime(2027, 3, 10), new DateTime(2027, 3, 13), new List<int>());

        Assert.Equal(600m, price); // 3 noce x 200 zł
    }

    [Fact(DisplayName = "Cena: w sezonie cena z cennika nadpisuje cenę bazową")]
    public async Task UsesSeasonalPrice_InsideSeason()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var price = await service.CalculateTotalPriceAsync(TestData.StandardRoomTypeId, new DateTime(2027, 7, 10), new DateTime(2027, 7, 13), new List<int>());

        Assert.Equal(1050m, price); // 3 noce x 350 zł
    }

    [Fact(DisplayName = "Cena: pobyt na początku sezonu łączy cenę bazową i sezonową")]
    public async Task CombinesPrices_WhenStayStartsBeforeSeason()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        // noce: 29.06 (200), 30.06 (200), 01.07 (350)
        var price = await service.CalculateTotalPriceAsync(TestData.StandardRoomTypeId, new DateTime(2027, 6, 29), new DateTime(2027, 7, 2), new List<int>());

        Assert.Equal(750m, price);
    }

    [Fact(DisplayName = "Cena: ostatni dzień sezonu (data końcowa cennika) liczony jest jeszcze po cenie sezonowej")]
    public async Task CombinesPrices_WhenStayEndsAfterSeason()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        // noce: 30.07 (350), 31.07 (350 - ostatni dzień sezonu), 01.08 (200)
        var price = await service.CalculateTotalPriceAsync(TestData.StandardRoomTypeId, new DateTime(2027, 7, 30), new DateTime(2027, 8, 2), new List<int>());

        Assert.Equal(900m, price);
    }

    [Fact(DisplayName = "Cena: dzień wymeldowania nie jest liczony jako noc")]
    public async Task DoesNotChargeCheckOutDay()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        // 1 noc: 30.06 (200) - wymeldowanie 01.07 już w sezonie, ale za tę noc się nie płaci
        var price = await service.CalculateTotalPriceAsync(TestData.StandardRoomTypeId, new DateTime(2027, 6, 30), new DateTime(2027, 7, 1), new List<int>());

        Assert.Equal(200m, price);
    }

    [Fact(DisplayName = "Cena: cennik sezonowy jednego typu pokoju nie wpływa na inne typy")]
    public async Task SeasonalPriceAppliesOnlyToItsRoomType()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var price = await service.CalculateTotalPriceAsync(TestData.PremiumRoomTypeId, new DateTime(2027, 7, 10), new DateTime(2027, 7, 12), new List<int>());

        Assert.Equal(1000m, price); // 2 noce x 500 zł (cena bazowa apartamentu)
    }

    [Fact(DisplayName = "Cena: usługi dodatkowe są doliczane do ceny pobytu")]
    public async Task AddsAdditionalServices()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var price = await service.CalculateTotalPriceAsync(TestData.StandardRoomTypeId, new DateTime(2027, 3, 10), new DateTime(2027, 3, 13),
            new List<int> { TestData.BreakfastId, TestData.ParkingId }, numberOfGuests: 2);

        Assert.Equal(990m, price); // 3 noce x 200 zł + śniadanie 2 os. x 3 noce x 50 zł + parking 3 noce x 30 zł
    }

    [Fact(DisplayName = "Cena: nieistniejąca usługa dodatkowa jest pomijana")]
    public async Task IgnoresUnknownAdditionalServices()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var price = await service.CalculateTotalPriceAsync(TestData.StandardRoomTypeId, new DateTime(2027, 3, 10), new DateTime(2027, 3, 13),
            new List<int> { TestData.BreakfastId, 999 });

        Assert.Equal(750m, price); // 600 zł + śniadanie 1 os. x 3 noce x 50 zł
    }

    [Fact(DisplayName = "Cena: liczba gości nie zmienia ceny noclegu, tylko usług naliczanych za osobę")]
    public async Task GuestsAffectOnlyPerPersonServices()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);
        var checkIn = new DateTime(2027, 3, 10);
        var checkOut = new DateTime(2027, 3, 12);

        var roomOnlyFor1 = await service.CalculateTotalPriceAsync(TestData.PremiumRoomTypeId, checkIn, checkOut, new List<int>(), numberOfGuests: 1);
        var roomOnlyFor4 = await service.CalculateTotalPriceAsync(TestData.PremiumRoomTypeId, checkIn, checkOut, new List<int>(), numberOfGuests: 4);
        var withBreakfastFor4 = await service.CalculateTotalPriceAsync(TestData.PremiumRoomTypeId, checkIn, checkOut, new List<int> { TestData.BreakfastId }, numberOfGuests: 4);

        Assert.Equal(1000m, roomOnlyFor1); // 2 noce x 500 zł - cena za pokój
        Assert.Equal(1000m, roomOnlyFor4);
        Assert.Equal(1400m, withBreakfastFor4); // + śniadanie 4 os. x 2 noce x 50 zł
    }

    [Theory(DisplayName = "Cena: liczba naliczeń usługi zależy od sposobu naliczania (pobyt 3 noce, 2 osoby)")]
    [InlineData("per-stay", 1)]
    [InlineData("per-night", 3)]
    [InlineData("per-person", 2)]
    [InlineData("per-person-per-night", 6)]
    public void ServiceQuantity_DependsOnChargeType(string chargeType, int expected)
    {
        Assert.Equal(expected, Services.Constants.ServiceChargeType.Quantity(chargeType, nights: 3, guests: 2));
    }

    [Fact(DisplayName = "Cena: dla nieistniejącego typu pokoju rzucany jest wyjątek")]
    public async Task Throws_ForUnknownRoomType()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CalculateTotalPriceAsync(999, new DateTime(2027, 3, 10), new DateTime(2027, 3, 13), new List<int>()));

        Assert.Equal("Nieznany typ pokoju.", exception.Message);
    }
}