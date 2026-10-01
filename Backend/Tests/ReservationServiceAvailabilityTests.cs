using Model;

namespace Tests;

// Testy sprawdzania dostępności pokoju - ReservationService.GetAvailableRoomIdAsync
public class ReservationServiceAvailabilityTests
{
    private static readonly DateTime CheckIn = new DateTime(2027, 3, 10);
    private static readonly DateTime CheckOut = new DateTime(2027, 3, 15);

    [Fact(DisplayName = "Dostępność: bez rezerwacji zwracany jest pierwszy wolny pokój danego typu")]
    public async Task ReturnsFirstRoom_WhenNoReservations()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var roomId = await service.GetAvailableRoomIdAsync(TestData.StandardRoomTypeId, CheckIn, CheckOut);

        Assert.Equal(TestData.Room101Id, roomId);
    }

    [Theory(DisplayName = "Dostępność: pokój zajęty w nakładającym się terminie jest pomijany")]
    [InlineData("2027-03-08", "2027-03-11")] // zachodzi na początek pobytu
    [InlineData("2027-03-14", "2027-03-18")] // zachodzi na koniec pobytu
    [InlineData("2027-03-11", "2027-03-13")] // w całości w środku pobytu
    [InlineData("2027-03-05", "2027-03-20")] // obejmuje cały pobyt
    [InlineData("2027-03-10", "2027-03-15")] // dokładnie ten sam termin
    public async Task SkipsRoom_WhenReservationOverlaps(string checkIn, string checkOut)
    {
        using var context = TestData.CreateContext();
        TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut);
        var service = TestData.CreateReservationService(context);

        var roomId = await service.GetAvailableRoomIdAsync(TestData.StandardRoomTypeId, DateTime.Parse(checkIn), DateTime.Parse(checkOut));

        Assert.Equal(TestData.Room102Id, roomId);
    }

    [Theory(DisplayName = "Dostępność: termin stykający się z inną rezerwacją (dzień wymeldowania = dzień zameldowania) jest wolny")]
    [InlineData("2027-03-05", "2027-03-10")] // nowy pobyt kończy się w dniu zameldowania istniejącego
    [InlineData("2027-03-15", "2027-03-20")] // nowy pobyt zaczyna się w dniu wymeldowania istniejącego
    public async Task ReturnsRoom_WhenTermOnlyTouchesExistingReservation(string checkIn, string checkOut)
    {
        using var context = TestData.CreateContext();
        TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut);
        var service = TestData.CreateReservationService(context);

        var roomId = await service.GetAvailableRoomIdAsync(TestData.StandardRoomTypeId, DateTime.Parse(checkIn), DateTime.Parse(checkOut));

        Assert.Equal(TestData.Room101Id, roomId);
    }

    [Fact(DisplayName = "Dostępność: gdy wszystkie pokoje typu są zajęte, zwracany jest null")]
    public async Task ReturnsNull_WhenAllRoomsOfTypeAreReserved()
    {
        using var context = TestData.CreateContext();
        TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut);
        TestData.AddReservation(context, TestData.Room102Id, CheckIn, CheckOut, guestId: 11);
        var service = TestData.CreateReservationService(context);

        var roomId = await service.GetAvailableRoomIdAsync(TestData.StandardRoomTypeId, CheckIn, CheckOut);

        Assert.Null(roomId);
    }

    [Fact(DisplayName = "Dostępność: anulowana rezerwacja nie blokuje pokoju")]
    public async Task IgnoresCancelledReservations()
    {
        using var context = TestData.CreateContext();
        TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut, status: "cancelled");
        var service = TestData.CreateReservationService(context);

        var roomId = await service.GetAvailableRoomIdAsync(TestData.StandardRoomTypeId, CheckIn, CheckOut);

        Assert.Equal(TestData.Room101Id, roomId);
    }

    [Theory(DisplayName = "Dostępność: rezerwacje oczekujące, zrealizowane i z niestawieniem się nadal zajmują pokój")]
    [InlineData("pending")]
    [InlineData("completed")]
    [InlineData("no-show")]
    public async Task TreatsNonCancelledStatusesAsOccupied(string status)
    {
        using var context = TestData.CreateContext();
        TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut, status: status);
        var service = TestData.CreateReservationService(context);

        var roomId = await service.GetAvailableRoomIdAsync(TestData.StandardRoomTypeId, CheckIn, CheckOut);

        Assert.Equal(TestData.Room102Id, roomId);
    }

    [Fact(DisplayName = "Dostępność: pokój z blokadą (np. remont) w tym terminie jest pomijany")]
    public async Task SkipsRoom_WhenRoomIsBlocked()
    {
        using var context = TestData.CreateContext();
        context.RoomBlocks.Add(new RoomBlock
        {
            RoomId = TestData.Room101Id,
            OwnerId = 1,
            StartDate = new DateTime(2027, 3, 12),
            EndDate = new DateTime(2027, 3, 20),
            Reason = "remont"
        });
        context.SaveChanges();
        var service = TestData.CreateReservationService(context);

        var roomId = await service.GetAvailableRoomIdAsync(TestData.StandardRoomTypeId, CheckIn, CheckOut);

        Assert.Equal(TestData.Room102Id, roomId);
    }

    [Theory(DisplayName = "Dostępność: pokój o statusie innym niż 'available' jest pomijany")]
    [InlineData("maintenance")]
    [InlineData("cleaning")]
    [InlineData("disabled")]
    public async Task SkipsRoom_WhenRoomStatusIsNotAvailable(string status)
    {
        using var context = TestData.CreateContext();
        var room = context.Rooms.Single(r => r.RoomId == TestData.Room101Id);
        room.Status = status;
        context.SaveChanges();
        var service = TestData.CreateReservationService(context);

        var roomId = await service.GetAvailableRoomIdAsync(TestData.StandardRoomTypeId, CheckIn, CheckOut);

        Assert.Equal(TestData.Room102Id, roomId);
    }

    [Fact(DisplayName = "Dostępność: rezerwacja innego typu pokoju nie wpływa na wynik")]
    public async Task IgnoresReservationsOfOtherRoomTypes()
    {
        using var context = TestData.CreateContext();
        TestData.AddReservation(context, TestData.Room201Id, CheckIn, CheckOut);
        var service = TestData.CreateReservationService(context);

        var standardRoomId = await service.GetAvailableRoomIdAsync(TestData.StandardRoomTypeId, CheckIn, CheckOut);
        var premiumRoomId = await service.GetAvailableRoomIdAsync(TestData.PremiumRoomTypeId, CheckIn, CheckOut);

        Assert.Equal(TestData.Room101Id, standardRoomId);
        Assert.Null(premiumRoomId);
    }

    [Fact(DisplayName = "Dostępność: dla nieistniejącego typu pokoju zwracany jest null")]
    public async Task ReturnsNull_ForUnknownRoomType()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var roomId = await service.GetAvailableRoomIdAsync(999, CheckIn, CheckOut);

        Assert.Null(roomId);
    }
}