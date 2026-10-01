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
            AdditionalServiceIds = new List<int> { TestData.BreakfastId, TestData.ParkingId }
        });

        Assert.True(success);
        var reservation = await context.Reservations.Include(r => r.ReservationServices).SingleAsync();
        Assert.Equal(TestData.GuestId, reservation.GuestId);
        Assert.Equal(TestData.Room101Id, reservation.RoomId);
        Assert.Equal("pending", reservation.Status);
        Assert.Equal(680m, reservation.TotalPrice); // 3 noce x 200 zł + 50 zł + 30 zł
        Assert.Equal(2, reservation.ReservationServices.Count);
        Assert.Equal(80m, reservation.ReservationServices.Sum(rs => rs.TotalPrice)); // ceny usług zapisane na moment rezerwacji
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
            CheckOutDate = CheckOut
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
        var dto = new CreateReservationDto { GuestId = TestData.GuestId, RoomTypeId = TestData.StandardRoomTypeId, CheckInDate = CheckIn, CheckOutDate = CheckOut };

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
            CheckOutDate = CheckOut
        });

        Assert.False(success);
        Assert.Equal(1, await context.Reservations.CountAsync());
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
        await service.CreateReservationAsync(new CreateReservationDto { GuestId = TestData.GuestId, RoomTypeId = TestData.PremiumRoomTypeId, CheckInDate = CheckIn, CheckOutDate = CheckOut });
        var reservation = await context.Reservations.SingleAsync();

        await service.UpdateReservationStatusAsync(reservation.ReservationId, "cancelled");

        var entries = await context.Availabilities.Where(a => a.RoomId == TestData.Room201Id).ToListAsync();
        Assert.Equal(3, entries.Count);
        Assert.All(entries, a => Assert.Equal("free", a.Status));
        Assert.Equal(TestData.Room201Id, await service.GetAvailableRoomIdAsync(TestData.PremiumRoomTypeId, CheckIn, CheckOut));
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