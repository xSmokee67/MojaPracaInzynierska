using Microsoft.EntityFrameworkCore;
using Services.DTO;

namespace Tests;

// Testy obsługi rezerwacji - tworzenie, zmiana statusu, anulowanie, płatności i faktury
public class ReservationServiceWorkflowTests
{
    private static readonly DateTime CheckIn = new DateTime(2027, 3, 10);
    private static readonly DateTime CheckOut = new DateTime(2027, 3, 13);

    // --- TWORZENIE REZERWACJI ---

    [Fact(DisplayName = "Rezerwacja: utworzenie zapisuje pokój, cenę, usługi i status 'pending'")]
    public async Task CreateReservation_SavesReservationWithServices()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var success = await service.CreateReservationAsync(new CreateReservationDto
        {
            GuestId = TestData.GuestId,
            RoomTypeId = TestData.StandardRoomTypeId,
            CheckInDate = CheckIn,
            CheckOutDate = CheckOut,
            NumberOfGuests = 2,
            AdditionalServiceIds = new List<int> { TestData.BreakfastId, TestData.ParkingId }
        });

        Assert.True(success);
        var reservation = await context.Reservations.Include(r => r.ReservationServices).SingleAsync();
        Assert.Equal(TestData.GuestId, reservation.GuestId);
        Assert.Equal(TestData.Room101Id, reservation.RoomId);
        Assert.Equal("pending", reservation.Status);
        Assert.Equal(990m, reservation.TotalPrice); // 3 noce x 200 zł + śniadanie 2 os. x 3 noce x 50 zł + parking 3 noce x 30 zł
        Assert.Equal(2, reservation.ReservationServices.Count);
        Assert.Equal(390m, reservation.ReservationServices.Sum(rs => rs.TotalPrice)); // ceny usług zapisane na moment rezerwacji
        var breakfast = reservation.ReservationServices.Single(rs => rs.ServiceId == TestData.BreakfastId);
        Assert.Equal(6, breakfast.Quantity); // 2 osoby x 3 noce
        Assert.Equal("per-person-per-night", breakfast.ChargeType);
        Assert.Equal(3, reservation.ReservationServices.Single(rs => rs.ServiceId == TestData.ParkingId).Quantity);
    }

    [Fact(DisplayName = "Rezerwacja: utworzenie oznacza noce pobytu jako 'booked' w tabeli Availability")]
    public async Task CreateReservation_MarksAvailabilityAsBooked()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        await service.CreateReservationAsync(new CreateReservationDto
        {
            GuestId = TestData.GuestId,
            RoomTypeId = TestData.StandardRoomTypeId,
            CheckInDate = CheckIn,
            CheckOutDate = CheckOut,
            NumberOfGuests = 2
        });

        var entries = await context.Availabilities.Where(a => a.RoomId == TestData.Room101Id).OrderBy(a => a.Date).ToListAsync();
        Assert.Equal(3, entries.Count); // 10, 11 i 12 marca - dzień wymeldowania pozostaje wolny
        Assert.All(entries, a => Assert.Equal("booked", a.Status));
        Assert.Equal(CheckIn, entries.First().Date);
        Assert.Equal(CheckOut.AddDays(-1), entries.Last().Date);
    }

    [Fact(DisplayName = "Rezerwacja: druga rezerwacja w tym samym terminie trafia do kolejnego wolnego pokoju")]
    public async Task CreateReservation_AssignsNextFreeRoom()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);
        var dto = new CreateReservationDto { GuestId = TestData.GuestId, RoomTypeId = TestData.StandardRoomTypeId, CheckInDate = CheckIn, CheckOutDate = CheckOut, NumberOfGuests = 2 };

        await service.CreateReservationAsync(dto);
        await service.CreateReservationAsync(dto);

        var roomIds = await context.Reservations.OrderBy(r => r.ReservationId).Select(r => r.RoomId).ToListAsync();
        Assert.Equal(new List<int> { TestData.Room101Id, TestData.Room102Id }, roomIds);
    }

    [Fact(DisplayName = "Rezerwacja: brak wolnego pokoju zwraca false i niczego nie zapisuje")]
    public async Task CreateReservation_ReturnsFalse_WhenNoRoomAvailable()
    {
        using var context = TestData.CreateContext();
        TestData.AddReservation(context, TestData.Room201Id, CheckIn, CheckOut);
        var service = TestData.CreateReservationService(context);

        var success = await service.CreateReservationAsync(new CreateReservationDto
        {
            GuestId = TestData.GuestId,
            RoomTypeId = TestData.PremiumRoomTypeId,
            CheckInDate = CheckIn,
            CheckOutDate = CheckOut,
            NumberOfGuests = 2
        });

        Assert.False(success);
        Assert.Equal(1, await context.Reservations.CountAsync());
    }

    [Fact(DisplayName = "Rezerwacja: zapisuje liczbę gości, gdy mieści się w pokoju (dokładnie MaxOccupancy)")]
    public async Task CreateReservation_SavesNumberOfGuests()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var success = await service.CreateReservationAsync(new CreateReservationDto
        {
            GuestId = TestData.GuestId,
            RoomTypeId = TestData.PremiumRoomTypeId,
            CheckInDate = CheckIn,
            CheckOutDate = CheckOut,
            NumberOfGuests = 4 // Apartament Premium mieści 4 osoby
        });

        Assert.True(success);
        Assert.Equal(4, (await context.Reservations.SingleAsync()).NumberOfGuests);
    }

    [Theory(DisplayName = "Rezerwacja: liczba gości spoza zakresu 1 - MaxOccupancy jest odrzucana i niczego nie zapisuje")]
    [InlineData(0)]
    [InlineData(3)] // Pokój Standardowy mieści 2 osoby
    public async Task CreateReservation_Throws_WhenGuestsDoNotFit(int numberOfGuests)
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateReservationAsync(new CreateReservationDto
        {
            GuestId = TestData.GuestId,
            RoomTypeId = TestData.StandardRoomTypeId,
            CheckInDate = CheckIn,
            CheckOutDate = CheckOut,
            NumberOfGuests = numberOfGuests
        }));

        Assert.Equal(0, await context.Reservations.CountAsync());
        Assert.Equal(0, await context.Availabilities.CountAsync());
    }

    [Fact(DisplayName = "Zmiana terminu: usługi naliczane za noc są przeliczane na nową liczbę nocy (ceny z chwili rezerwacji)")]
    public async Task ChangeDates_RecalculatesPerNightServices()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);
        await service.CreateReservationAsync(new CreateReservationDto
        {
            GuestId = TestData.GuestId,
            RoomTypeId = TestData.StandardRoomTypeId,
            CheckInDate = CheckIn,
            CheckOutDate = CheckOut,
            NumberOfGuests = 2,
            AdditionalServiceIds = new List<int> { TestData.BreakfastId, TestData.ParkingId }
        });
        var reservation = await context.Reservations.SingleAsync();

        // Po rezerwacji hotel podnosi cenę śniadania - rezerwacja zachowuje cenę z chwili rezerwacji
        (await context.AdditionalServices.FindAsync(TestData.BreakfastId))!.Price = 80;
        await context.SaveChangesAsync();

        await service.ChangeReservationDatesAsync(reservation.ReservationId, new ChangeReservationDatesDto { CheckInDate = CheckIn, CheckOutDate = CheckIn.AddDays(5) }, null);

        var updated = await context.Reservations.Include(r => r.ReservationServices).SingleAsync();
        Assert.Equal(10, updated.ReservationServices.Single(rs => rs.ServiceId == TestData.BreakfastId).Quantity); // 2 osoby x 5 nocy
        Assert.Equal(1650m, updated.TotalPrice); // 5 nocy x 200 zł + śniadanie 10 x 50 zł + parking 5 x 30 zł
    }

    // --- ZMIANA STATUSU (WŁAŚCICIEL) ---

    [Theory(DisplayName = "Status: właściciel może ustawić każdy status ze słownika danych")]
    [InlineData("confirmed")]
    [InlineData("completed")]
    [InlineData("no-show")]
    [InlineData("cancelled")]
    public async Task UpdateStatus_SetsAllowedStatus(string status)
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut, status: "pending");
        var service = TestData.CreateReservationService(context);

        var success = await service.UpdateReservationStatusAsync(reservation.ReservationId, status);

        Assert.True(success);
        Assert.Equal(status, (await context.Reservations.FindAsync(reservation.ReservationId))!.Status);
    }

    [Fact(DisplayName = "Status: nieznany status jest odrzucany")]
    public async Task UpdateStatus_Throws_ForUnknownStatus()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut, status: "pending");
        var service = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateReservationStatusAsync(reservation.ReservationId, "paid"));
    }

    [Fact(DisplayName = "Status: zmiana statusu nieistniejącej rezerwacji zwraca false")]
    public async Task UpdateStatus_ReturnsFalse_WhenReservationNotFound()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);

        var success = await service.UpdateReservationStatusAsync(999, "confirmed");

        Assert.False(success);
    }

    [Fact(DisplayName = "Status: anulowanej rezerwacji nie można przywrócić")]
    public async Task UpdateStatus_Throws_WhenRestoringCancelledReservation()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut, status: "cancelled");
        var service = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateReservationStatusAsync(reservation.ReservationId, "confirmed"));
    }

    [Fact(DisplayName = "Status: anulowanie przez właściciela zwalnia pokój (Availability = 'free' i pokój znów dostępny)")]
    public async Task UpdateStatus_Cancelled_FreesRoom()
    {
        using var context = TestData.CreateContext();
        var service = TestData.CreateReservationService(context);
        await service.CreateReservationAsync(new CreateReservationDto { GuestId = TestData.GuestId, RoomTypeId = TestData.PremiumRoomTypeId, CheckInDate = CheckIn, CheckOutDate = CheckOut, NumberOfGuests = 2 });
        var reservation = await context.Reservations.SingleAsync();

        await service.UpdateReservationStatusAsync(reservation.ReservationId, "cancelled");

        var entries = await context.Availabilities.Where(a => a.RoomId == TestData.Room201Id).ToListAsync();
        Assert.Equal(3, entries.Count);
        Assert.All(entries, a => Assert.Equal("free", a.Status));
        Assert.Equal(TestData.Room201Id, await new Services.Services.AvailabilityService(context).GetAvailableRoomIdAsync(TestData.PremiumRoomTypeId, CheckIn, CheckOut));
    }

    // --- ANULOWANIE PRZEZ GOŚCIA ---

    [Fact(DisplayName = "Anulowanie: gość anuluje własną przyszłą rezerwację")]
    public async Task CancelByGuest_CancelsOwnFutureReservation()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, DateTime.Today.AddDays(10), DateTime.Today.AddDays(12), status: "confirmed");
        var service = TestData.CreateReservationService(context);

        var success = await service.CancelReservationByGuestAsync(reservation.ReservationId, TestData.GuestId);

        Assert.True(success);
        Assert.Equal("cancelled", (await context.Reservations.FindAsync(reservation.ReservationId))!.Status);
    }

    [Fact(DisplayName = "Anulowanie: gość nie może anulować cudzej rezerwacji")]
    public async Task CancelByGuest_ReturnsFalse_ForOtherGuestsReservation()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, DateTime.Today.AddDays(10), DateTime.Today.AddDays(12), guestId: 11);
        var service = TestData.CreateReservationService(context);

        var success = await service.CancelReservationByGuestAsync(reservation.ReservationId, TestData.GuestId);

        Assert.False(success);
        Assert.Equal("confirmed", (await context.Reservations.FindAsync(reservation.ReservationId))!.Status);
    }

    [Fact(DisplayName = "Anulowanie: nie można anulować w dniu zameldowania ani później")]
    public async Task CancelByGuest_Throws_OnCheckInDay()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, DateTime.Today, DateTime.Today.AddDays(2));
        var service = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CancelReservationByGuestAsync(reservation.ReservationId, TestData.GuestId));
    }

    [Theory(DisplayName = "Anulowanie: gość może anulować tylko rezerwację oczekującą lub potwierdzoną")]
    [InlineData("completed")]
    [InlineData("no-show")]
    [InlineData("cancelled")]
    public async Task CancelByGuest_Throws_ForFinishedReservation(string status)
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, DateTime.Today.AddDays(10), DateTime.Today.AddDays(12), status: status);
        var service = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CancelReservationByGuestAsync(reservation.ReservationId, TestData.GuestId));
    }

    // --- PŁATNOŚCI ---

    [Fact(DisplayName = "Płatność: rejestracja zapisuje kwotę i metodę, domyślny status to 'completed'")]
    public async Task RegisterPayment_SavesPayment()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut);
        var service = TestData.CreateReservationService(context);

        var success = await service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = 300, Method = "BLIK" });

        Assert.True(success);
        var payment = await context.Payments.SingleAsync();
        Assert.Equal(reservation.ReservationId, payment.ReservationId);
        Assert.Equal(300m, payment.Amount);
        Assert.Equal("BLIK", payment.Method);
        Assert.Equal("completed", payment.Status);
    }

    [Theory(DisplayName = "Płatność: nieprawidłowe dane są odrzucane")]
    [InlineData(100, "bitcoin", "completed")] // nieznana metoda
    [InlineData(0, "card", "completed")]      // kwota zero
    [InlineData(-50, "cash", "completed")]    // kwota ujemna
    [InlineData(100, "card", "paid")]         // nieznany status
    public async Task RegisterPayment_Throws_ForInvalidData(int amount, string method, string status)
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut);
        var service = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = amount, Method = method, Status = status }));
        Assert.Equal(0, await context.Payments.CountAsync());
    }

    [Fact(DisplayName = "Płatność: do anulowanej rezerwacji można zarejestrować tylko zwrot")]
    public async Task RegisterPayment_AllowsOnlyRefund_ForCancelledReservation()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut, status: "cancelled");
        var service = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = 100, Method = "card", Status = "completed" }));
        var refund = await service.RegisterPaymentAsync(reservation.ReservationId, new PaymentDto { Amount = 100, Method = "transfer", Status = "refunded" });

        Assert.True(refund);
        Assert.Equal("refunded", (await context.Payments.SingleAsync()).Status);
    }

    // --- FAKTURY ---

    [Fact(DisplayName = "Faktura: wystawiana dla zrealizowanej rezerwacji na kwotę rezerwacji")]
    public async Task IssueInvoice_CreatesInvoiceForCompletedReservation()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut, status: "completed", totalPrice: 680);
        var service = TestData.CreateReservationService(context);

        var success = await service.IssueInvoiceAsync(reservation.ReservationId);

        Assert.True(success);
        var invoice = await context.Invoices.SingleAsync();
        Assert.Equal(680m, invoice.GrossAmount);
        Assert.Equal($"FV/{invoice.IssueDate:yyyy}/{invoice.IssueDate:MM}/{reservation.ReservationId:D5}", invoice.InvoiceNumber);
    }

    [Theory(DisplayName = "Faktura: nie można wystawić faktury dla niezrealizowanej rezerwacji")]
    [InlineData("pending")]
    [InlineData("confirmed")]
    [InlineData("cancelled")]
    public async Task IssueInvoice_Throws_WhenReservationNotCompleted(string status)
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut, status: status);
        var service = TestData.CreateReservationService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.IssueInvoiceAsync(reservation.ReservationId));
        Assert.Equal(0, await context.Invoices.CountAsync());
    }

    [Fact(DisplayName = "Faktura: do jednej rezerwacji można wystawić tylko jedną fakturę")]
    public async Task IssueInvoice_Throws_WhenInvoiceAlreadyExists()
    {
        using var context = TestData.CreateContext();
        var reservation = TestData.AddReservation(context, TestData.Room101Id, CheckIn, CheckOut, status: "completed");
        var service = TestData.CreateReservationService(context);
        await service.IssueInvoiceAsync(reservation.ReservationId);

        await Assert.ThrowsAsync<ArgumentException>(() => service.IssueInvoiceAsync(reservation.ReservationId));
        Assert.Equal(1, await context.Invoices.CountAsync());
    }
}