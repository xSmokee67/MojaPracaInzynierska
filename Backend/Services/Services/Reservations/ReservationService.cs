using AutoMapper;
using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;
using Services.Validation;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class ReservationService : IReservationService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IAvailabilityService _availabilityService;
    private readonly INotificationService _notificationService;

    public ReservationService(ApplicationDbContext context, IMapper mapper, IAvailabilityService availabilityService, INotificationService notificationService)
    {
        _context = context;
        _mapper = mapper;
        _availabilityService = availabilityService;
        _notificationService = notificationService;
    }

    // Ile innych terminów proponujemy, gdy w wybranym nie ma wolnego pokoju
    private const int AlternativeStaysCount = 3;

    // Na opłacenie rezerwacji gość ma tyle dni od jej złożenia (ale najpóźniej do dnia przed przyjazdem)
    public const int PaymentDays = 3;

    // Termin płatności: 3 dni od rezerwacji, ale najpóźniej dzień przed przyjazdem.
    // Przy rezerwacji na dziś lub jutro - do końca dzisiejszego dnia. Po tym dniu nieopłacona rezerwacja jest anulowana.
    public static DateTime PaymentDeadlineFor(DateTime checkIn, DateTime today)
    {
        var deadline = today.Date.AddDays(PaymentDays);
        var dayBeforeArrival = checkIn.Date.AddDays(-1);

        if (dayBeforeArrival < deadline)
        {
            deadline = dayBeforeArrival;
        }

        return deadline < today.Date ? today.Date : deadline;
    }

    // Suma zaksięgowanych wpłat rezerwacji (zwroty i nieudane płatności się nie liczą)
    private async Task<decimal> GetPaidAmountAsync(int reservationId) =>
        await _context.Payments
            .Where(p => p.ReservationId == reservationId && p.Status == PaymentStatus.Completed)
            .SumAsync(p => p.Amount);

    // Termin w treści powiadomień, np. "10.11.2026 - 13.11.2026"
    private static string StayDates(DateTime checkIn, DateTime checkOut) => $"{checkIn:dd.MM.yyyy} - {checkOut:dd.MM.yyyy}";

    // Komunikaty dla gościa po zmianie statusu przez hotel
    private static readonly Dictionary<string, string> StatusMessages = new()
    {
        [ReservationStatus.Confirmed] = "została potwierdzona przez hotel.",
        [ReservationStatus.Cancelled] = "została anulowana przez hotel.",
        [ReservationStatus.Completed] = "została zakończona. Możesz wystawić opinię o pobycie.",
        [ReservationStatus.Pending] = "oczekuje ponownie na potwierdzenie."
    };

    // Status, po którym noce rezerwacji wracają do puli wolnych pokoi (tak samo liczy moduł dostępności)
    private static bool ReleasesRoom(string status) => status == ReservationStatus.Cancelled;

    // Automatyczne statusy - wywoływane przez API przy starcie i potem co godzinę (BackgroundJobs/ReservationStatusJob):
    // - potwierdzona rezerwacja po dniu wymeldowania -> zakończona (gość może wystawić opinię, hotel - fakturę),
    // - rezerwacja nieopłacona w całości do końca dnia terminu płatności -> anulowana; jej noce wracają do puli wolnych pokoi.
    // Zwraca liczbę zmienionych rezerwacji.
    public async Task<int> UpdateExpiredReservationsAsync()
    {
        var today = DateTime.Today;

        var expired = await _context.Reservations
            .Where(r => (r.Status == ReservationStatus.Confirmed && r.CheckOutDate < today)
                || (r.Status == ReservationStatus.Pending && r.PaymentDeadline < today))
            .OrderBy(r => r.ReservationId)
            .ToListAsync();

        foreach (var reservation in expired)
        {
            var stay = StayDates(reservation.CheckInDate, reservation.CheckOutDate);

            if (reservation.Status == ReservationStatus.Confirmed)
            {
                reservation.Status = ReservationStatus.Completed;
                await _context.SaveChangesAsync();

                await _notificationService.NotifyUserAsync(reservation.GuestId, $"Rezerwacja #{reservation.ReservationId} ({stay}) {StatusMessages[ReservationStatus.Completed]}", reservation.ReservationId);
            }
            else if (await GetPaidAmountAsync(reservation.ReservationId) >= reservation.TotalPrice)
            {
                // Opłacona w całości (wpłata zarejestrowana, ale rezerwacja nie zmieniła statusu) - potwierdzamy zamiast anulować
                reservation.Status = ReservationStatus.Confirmed;
                await _context.SaveChangesAsync();

                await _notificationService.NotifyUserAsync(reservation.GuestId, $"Rezerwacja #{reservation.ReservationId} ({stay}) {StatusMessages[ReservationStatus.Confirmed]}", reservation.ReservationId);
            }
            else
            {
                reservation.Status = ReservationStatus.Cancelled;
                await _context.SaveChangesAsync();

                var deadline = $"{reservation.PaymentDeadline:dd.MM.yyyy}";
                await _notificationService.NotifyUserAsync(reservation.GuestId, $"Rezerwacja #{reservation.ReservationId} ({stay}) została automatycznie anulowana - nie została opłacona do {deadline}. Ewentualne wpłaty zwróci hotel.", reservation.ReservationId);
                await _notificationService.NotifyOwnersAsync($"Rezerwacja #{reservation.ReservationId} ({stay}) nie została opłacona do {deadline} - anulowano automatycznie, pokój wrócił do puli wolnych.", reservation.ReservationId);
            }
        }

        return expired.Count;
    }

    // Wyszukiwarka na stronie głównej: dostępność i cena całego pobytu dla każdego typu pokoju
    public async Task<List<RoomTypeAvailabilityDto>> SearchRoomTypesAsync(DateTime checkIn, DateTime checkOut, int guests)
    {
        var roomTypes = await _context.RoomTypes.ToListAsync();
        var results = new List<RoomTypeAvailabilityDto>();

        foreach (var roomType in roomTypes)
        {
            var availableRoomIds = await _availabilityService.GetAvailableRoomIdsAsync(roomType.RoomTypeId, checkIn, checkOut);

            results.Add(new RoomTypeAvailabilityDto
            {
                RoomTypeId = roomType.RoomTypeId,
                FitsGuests = roomType.MaxOccupancy >= guests,
                IsAvailable = availableRoomIds.Count > 0,
                AvailableRooms = availableRoomIds.Count,
                Nights = (checkOut.Date - checkIn.Date).Days,
                TotalPrice = await CalculateTotalPriceAsync(roomType.RoomTypeId, checkIn, checkOut, new List<int>())
            });
        }

        return results;
    }

    // Propozycje innych terminów (moduł dostępności) z ceną całego pobytu według cennika
    public async Task<List<AlternativeStayDto>> GetAlternativeStaysAsync(int roomTypeId, DateTime checkIn, DateTime checkOut)
    {
        var stays = await _availabilityService.FindAlternativeStaysAsync(roomTypeId, checkIn, checkOut, AlternativeStaysCount);

        foreach (var stay in stays)
        {
            stay.TotalPrice = await CalculateTotalPriceAsync(roomTypeId, stay.CheckInDate, stay.CheckOutDate, new List<int>());
        }

        return stays;
    }

    // Cena pobytu = noclegi (cena za pokój za noc, według cennika sezonowego) + usługi dodatkowe według sposobu naliczania.
    // Liczba gości nie zmienia ceny noclegu, wpływa tylko na usługi naliczane za osobę (np. śniadanie).
    public async Task<decimal> CalculateTotalPriceAsync(int roomTypeId, DateTime checkIn, DateTime checkOut, List<int> additionalServiceIds, int numberOfGuests = 1)
    {
        var roomType = await _context.RoomTypes
            .Include(rt => rt.PriceListEntries)
            .FirstOrDefaultAsync(rt => rt.RoomTypeId == roomTypeId);

        if (roomType == null)
        {
            throw new ArgumentException("Nieznany typ pokoju.");
        }

        decimal totalRoomPrice = 0;

        for (var date = checkIn.Date; date < checkOut.Date; date = date.AddDays(1))
        {
            var seasonalPrice = roomType.PriceListEntries
                .FirstOrDefault(p => p.StartDate.Date <= date && p.EndDate.Date >= date);

            totalRoomPrice += seasonalPrice != null ? seasonalPrice.PricePerNight : roomType.BasePrice;
        }

        var nights = (checkOut.Date - checkIn.Date).Days;
        var services = await PriceAdditionalServicesAsync(additionalServiceIds, nights, numberOfGuests);

        return totalRoomPrice + services.Sum(s => s.TotalPrice);
    }

    // Usługi dodatkowe wybrane do pobytu: liczba naliczeń według sposobu naliczania (np. śniadanie: osoby × noce) i cena.
    // Cena jednostkowa i sposób naliczania są zapisywane w rezerwacji - późniejsza zmiana cennika usług jej nie dotyczy.
    private async Task<List<Model.ReservationService>> PriceAdditionalServicesAsync(List<int> additionalServiceIds, int nights, int numberOfGuests)
    {
        if (numberOfGuests < 1)
        {
            throw new ArgumentException("Liczba gości musi wynosić co najmniej 1.");
        }

        if (!additionalServiceIds.Any())
        {
            return new List<Model.ReservationService>();
        }

        var services = await _context.AdditionalServices
            .Where(s => additionalServiceIds.Contains(s.ServiceId))
            .ToListAsync();

        return services.Select(service =>
        {
            var quantity = ServiceChargeType.Quantity(service.ChargeType, nights, numberOfGuests);
            return new Model.ReservationService
            {
                ServiceId = service.ServiceId,
                ChargeType = service.ChargeType,
                Quantity = quantity,
                TotalPrice = service.Price * quantity
            };
        }).ToList();
    }

    public async Task<bool> CreateReservationAsync(CreateReservationDto dto)
    {
        // Ta sama reguła terminu co w kontrolerze (przyjazd nie w przeszłości, przed wyjazdem, maks. 60 nocy)
        StayRules.EnsureValid(dto.CheckInDate, dto.CheckOutDate);

        // Liczba gości musi zmieścić się w pokoju - reguła po stronie serwera, niezależnie od filtrów w interfejsie
        var maxOccupancy = await _context.RoomTypes
            .Where(rt => rt.RoomTypeId == dto.RoomTypeId)
            .Select(rt => (int?)rt.MaxOccupancy)
            .FirstOrDefaultAsync();

        if (maxOccupancy == null)
        {
            throw new ArgumentException("Nieznany typ pokoju.");
        }

        if (dto.NumberOfGuests < 1 || dto.NumberOfGuests > maxOccupancy)
        {
            throw new ArgumentException($"Liczba gości musi wynosić od 1 do {maxOccupancy} - tyle osób mieści wybrany pokój.");
        }

        // Sprawdzenie dostępności i zapis rezerwacji w jednej transakcji: dwóch gości nie dostanie tego samego pokoju,
        // a rezerwacja i kalendarz dostępności zapisują się razem albo wcale (bez commita transakcja jest wycofywana)
        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _availabilityService.LockRoomTypeAsync(dto.RoomTypeId);

        var availableRoomId = await _availabilityService.GetAvailableRoomIdAsync(dto.RoomTypeId, dto.CheckInDate, dto.CheckOutDate);
        if (availableRoomId == null)
        {
            return false;
        }

        var totalPrice = await CalculateTotalPriceAsync(dto.RoomTypeId, dto.CheckInDate, dto.CheckOutDate, dto.AdditionalServiceIds, dto.NumberOfGuests);

        var reservation = _mapper.Map<Reservation>(dto);
        reservation.RoomId = availableRoomId.Value;
        reservation.TotalPrice = totalPrice;
        reservation.PaymentDeadline = PaymentDeadlineFor(dto.CheckInDate, DateTime.Today);

        // Usługi z liczbą naliczeń i ceną z chwili rezerwacji (ta sama metoda co przy wyliczaniu ceny)
        var nights = (dto.CheckOutDate.Date - dto.CheckInDate.Date).Days;
        foreach (var service in await PriceAdditionalServicesAsync(dto.AdditionalServiceIds, nights, dto.NumberOfGuests))
        {
            reservation.ReservationServices.Add(service);
        }

        await _context.Reservations.AddAsync(reservation);
        await _context.SaveChangesAsync();

        var roomTypeName = await _context.RoomTypes.Where(rt => rt.RoomTypeId == dto.RoomTypeId).Select(rt => rt.Name).FirstAsync();
        await _notificationService.NotifyOwnersAsync($"Nowa rezerwacja #{reservation.ReservationId}: {roomTypeName}, {StayDates(reservation.CheckInDate, reservation.CheckOutDate)}.", reservation.ReservationId);
        await _notificationService.NotifyUserAsync(reservation.GuestId, $"Rezerwacja #{reservation.ReservationId} została złożona. Opłać {reservation.TotalPrice:0.00} PLN do {reservation.PaymentDeadline:dd.MM.yyyy} - po zaksięgowaniu wpłaty rezerwacja zostanie potwierdzona, a nieopłacona w terminie zostanie automatycznie anulowana.", reservation.ReservationId);

        await transaction.CommitAsync();
        return true;
    }

    public async Task<List<ReservationDto>> GetGuestReservationsAsync(int guestId)
    {
        var reservations = await _context.Reservations
            .Include(r => r.Guest)
            .Include(r => r.Room)
                .ThenInclude(room => room.RoomType)
            .Include(r => r.ReservationServices)
                .ThenInclude(rs => rs.AdditionalService)
            .Where(r => r.GuestId == guestId)
            .OrderByDescending(r => r.CheckInDate)
            .ToListAsync();

        return _mapper.Map<List<ReservationDto>>(reservations);
    }

    public async Task<List<ReservationDto>> GetAllReservationsAsync()
    {
        var reservations = await _context.Reservations
            .Include(r => r.Guest)
            .Include(r => r.Room)
                .ThenInclude(room => room.RoomType)
            .Include(r => r.ReservationServices)
                .ThenInclude(rs => rs.AdditionalService)
            .OrderByDescending(r => r.CheckInDate)
            .ToListAsync();

        return _mapper.Map<List<ReservationDto>>(reservations);
    }

    public async Task<bool> UpdateReservationStatusAsync(int reservationId, string status)
    {
        if (!ReservationStatus.All.Contains(status))
        {
            throw new ArgumentException("Nieprawidłowy status rezerwacji.");
        }

        var reservation = await _context.Reservations.FindAsync(reservationId);
        if (reservation == null)
        {
            return false;
        }

        // Anulowana rezerwacja zwalnia pokój - przywrócenie mogłoby nałożyć się na nową rezerwację
        if (ReleasesRoom(reservation.Status) && status != reservation.Status)
        {
            throw new ArgumentException("Nie można przywrócić anulowanej rezerwacji - termin mógł zostać już zajęty.");
        }

        var statusChanged = reservation.Status != status;

        reservation.Status = status;
        await _context.SaveChangesAsync();

        // Status zmienia właściciel - informacja dla gościa
        if (statusChanged)
        {
            await _notificationService.NotifyUserAsync(reservation.GuestId, $"Rezerwacja #{reservation.ReservationId} ({StayDates(reservation.CheckInDate, reservation.CheckOutDate)}) {StatusMessages[status]}", reservation.ReservationId);
        }

        return true;
    }

    public async Task<ReservationDetailsDto?> GetReservationDetailsAsync(int reservationId)
    {
        var reservation = await _context.Reservations
            .Include(r => r.Guest)
            .Include(r => r.Room)
                .ThenInclude(room => room.RoomType)
            .Include(r => r.ReservationServices)
                .ThenInclude(rs => rs.AdditionalService)
            .Include(r => r.Payments)
            .Include(r => r.Invoice)
            .Include(r => r.Review)
            .FirstOrDefaultAsync(r => r.ReservationId == reservationId);

        if (reservation == null)
        {
            return null;
        }

        var details = _mapper.Map<ReservationDetailsDto>(reservation);
        details.Payments = details.Payments.OrderByDescending(p => p.PaymentDate).ToList();

        return details;
    }

    public async Task<bool> CancelReservationByGuestAsync(int reservationId, int guestId)
    {
        var reservation = await _context.Reservations.FindAsync(reservationId);
        if (reservation == null || reservation.GuestId != guestId)
        {
            return false;
        }

        if (reservation.Status != ReservationStatus.Pending && reservation.Status != ReservationStatus.Confirmed)
        {
            throw new ArgumentException("Można anulować tylko rezerwację oczekującą lub potwierdzoną.");
        }

        if (reservation.CheckInDate.Date <= DateTime.Today)
        {
            throw new ArgumentException("Rezerwację można anulować najpóźniej dzień przed zameldowaniem.");
        }

        reservation.Status = ReservationStatus.Cancelled;
        await _context.SaveChangesAsync();

        await _notificationService.NotifyOwnersAsync($"Gość anulował rezerwację #{reservation.ReservationId} ({StayDates(reservation.CheckInDate, reservation.CheckOutDate)}).", reservation.ReservationId);

        return true;
    }

    // Zmiana terminu: guestId = id gościa (tylko własna rezerwacja, najpóźniej dzień przed zameldowaniem),
    // guestId = null - zmiana przez właściciela (dowolna rezerwacja oczekująca lub potwierdzona)
    public async Task<bool> ChangeReservationDatesAsync(int reservationId, ChangeReservationDatesDto dto, int? guestId)
    {
        var reservation = await _context.Reservations
            .Include(r => r.Room)
            .Include(r => r.ReservationServices)
            .FirstOrDefaultAsync(r => r.ReservationId == reservationId);

        if (reservation == null || (guestId != null && reservation.GuestId != guestId))
        {
            return false;
        }

        if (reservation.Status != ReservationStatus.Pending && reservation.Status != ReservationStatus.Confirmed)
        {
            throw new ArgumentException("Termin można zmienić tylko w rezerwacji oczekującej lub potwierdzonej.");
        }

        if (guestId != null && reservation.CheckInDate.Date <= DateTime.Today)
        {
            throw new ArgumentException("Termin można zmienić najpóźniej dzień przed zameldowaniem.");
        }

        var newCheckIn = dto.CheckInDate.Date;
        var newCheckOut = dto.CheckOutDate.Date;

        if (newCheckIn >= newCheckOut)
        {
            throw new ArgumentException("Data wymeldowania musi być późniejsza niż data zameldowania.");
        }

        // Początek w przeszłości dopuszczalny tylko bez zmiany daty zameldowania - właściciel przedłuża lub skraca trwający pobyt
        if (newCheckIn < DateTime.Today && newCheckIn != reservation.CheckInDate.Date)
        {
            throw new ArgumentException("Nowy termin nie może zaczynać się w przeszłości.");
        }

        if (newCheckOut < DateTime.Today)
        {
            throw new ArgumentException("Data wymeldowania nie może być w przeszłości.");
        }

        if ((newCheckOut - newCheckIn).Days > StayRules.MaxNights)
        {
            throw new ArgumentException(StayRules.TooLongMessage);
        }

        if (newCheckIn == reservation.CheckInDate.Date && newCheckOut == reservation.CheckOutDate.Date)
        {
            throw new ArgumentException("Nowy termin jest taki sam jak obecny.");
        }

        var roomTypeId = reservation.Room.RoomTypeId;

        // Tak samo jak przy tworzeniu rezerwacji: sprawdzenie i zapis w jednej transakcji z blokadą pokoi danego typu
        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _availabilityService.LockRoomTypeAsync(roomTypeId);

        // Wolne pokoje w nowym terminie - zmieniana rezerwacja nie blokuje sama siebie
        var availableRoomIds = await _availabilityService.GetAvailableRoomIdsAsync(roomTypeId, newCheckIn, newCheckOut, reservation.ReservationId);
        if (availableRoomIds.Count == 0)
        {
            throw new ArgumentException("W nowym terminie nie ma wolnego pokoju tego typu. Wybierz inne daty.");
        }

        // Gość zostaje w swoim pokoju, jeśli jest wolny w nowym terminie - w przeciwnym razie pierwszy wolny pokój tego typu
        var newRoomId = availableRoomIds.Contains(reservation.RoomId) ? reservation.RoomId : availableRoomIds[0];

        // Nowa cena: noclegi według cennika w nowym terminie + usługi dodatkowe w cenach z chwili rezerwacji.
        // Usługi naliczane za noc (np. śniadanie, parking) są przeliczane na nową liczbę nocy - cena jednostkowa się nie zmienia.
        var roomPrice = await CalculateTotalPriceAsync(roomTypeId, newCheckIn, newCheckOut, new List<int>());
        var newNights = (newCheckOut - newCheckIn).Days;
        foreach (var service in reservation.ReservationServices)
        {
            var unitPrice = service.Quantity > 0 ? service.TotalPrice / service.Quantity : service.TotalPrice;
            service.Quantity = ServiceChargeType.Quantity(service.ChargeType, newNights, reservation.NumberOfGuests);
            service.TotalPrice = unitPrice * service.Quantity;
        }
        var servicesPrice = reservation.ReservationServices.Sum(s => s.TotalPrice);

        reservation.RoomId = newRoomId;
        reservation.CheckInDate = newCheckIn;
        reservation.CheckOutDate = newCheckOut;
        reservation.TotalPrice = roomPrice + servicesPrice;

        // Nieopłacona rezerwacja przeniesiona na wcześniejszy termin: płatność najpóźniej dzień przed nowym przyjazdem
        if (reservation.Status == ReservationStatus.Pending)
        {
            var newDeadline = PaymentDeadlineFor(newCheckIn, DateTime.Today);
            if (newDeadline < reservation.PaymentDeadline)
            {
                reservation.PaymentDeadline = newDeadline;
            }
        }
        await _context.SaveChangesAsync();

        // Zmianę wprowadza jedna strona - powiadomienie dostaje druga (gość albo właściciele)
        var roomNumber = await _context.Rooms.Where(r => r.RoomId == reservation.RoomId).Select(r => r.RoomNumber).FirstAsync();
        var newStay = $"{StayDates(reservation.CheckInDate, reservation.CheckOutDate)}, pokój {roomNumber}";
        if (guestId == null)
        {
            await _notificationService.NotifyUserAsync(reservation.GuestId, $"Hotel zmienił termin rezerwacji #{reservation.ReservationId} na {newStay}. Nowa cena: {reservation.TotalPrice:0.00} PLN.", reservation.ReservationId);
        }
        else
        {
            await _notificationService.NotifyOwnersAsync($"Gość zmienił termin rezerwacji #{reservation.ReservationId} na {newStay}.", reservation.ReservationId);
        }

        await transaction.CommitAsync();
        return true;
    }

    public async Task<bool> RegisterPaymentAsync(int reservationId, PaymentDto dto)
    {
        if (!PaymentMethod.All.Contains(dto.Method))
        {
            throw new ArgumentException("Nieprawidłowa metoda płatności.");
        }

        var status = string.IsNullOrWhiteSpace(dto.Status) ? PaymentStatus.Completed : dto.Status;
        if (!PaymentStatus.All.Contains(status))
        {
            throw new ArgumentException("Nieprawidłowy status płatności.");
        }

        if (dto.Amount <= 0)
        {
            throw new ArgumentException("Kwota płatności musi być większa od zera.");
        }

        var reservation = await _context.Reservations.FindAsync(reservationId);
        if (reservation == null)
        {
            return false;
        }

        if (reservation.Status == ReservationStatus.Cancelled && status != PaymentStatus.Refunded)
        {
            throw new ArgumentException("Do anulowanej rezerwacji można zarejestrować tylko zwrot.");
        }

        var payment = new Payment
        {
            ReservationId = reservationId,
            Amount = dto.Amount,
            PaymentDate = DateTime.UtcNow,
            Method = dto.Method,
            Status = status
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        // Wpłata całej kwoty potwierdza oczekującą rezerwację - bez osobnego klikania przez właściciela
        if (reservation.Status == ReservationStatus.Pending && await GetPaidAmountAsync(reservationId) >= reservation.TotalPrice)
        {
            reservation.Status = ReservationStatus.Confirmed;
            await _context.SaveChangesAsync();

            await _notificationService.NotifyUserAsync(reservation.GuestId, $"Wpłata za rezerwację #{reservation.ReservationId} ({StayDates(reservation.CheckInDate, reservation.CheckOutDate)}) została zaksięgowana - rezerwacja {StatusMessages[ReservationStatus.Confirmed]}", reservation.ReservationId);
        }

        return true;
    }

    public async Task<bool> IssueInvoiceAsync(int reservationId)
    {
        var reservation = await _context.Reservations
            .Include(r => r.Invoice)
            .FirstOrDefaultAsync(r => r.ReservationId == reservationId);

        if (reservation == null)
        {
            return false;
        }

        if (reservation.Status != ReservationStatus.Completed)
        {
            throw new ArgumentException("Fakturę można wystawić tylko dla zrealizowanej rezerwacji.");
        }

        if (reservation.Invoice != null)
        {
            throw new ArgumentException("Faktura dla tej rezerwacji została już wystawiona.");
        }

        var issueDate = DateTime.UtcNow;

        // Faktury są numerowane kolejno w serii miesiąca (wymóg kolejnej numeracji): FV/2026/11/00001, FV/2026/11/00002, ...
        // Miesiąc serii według czasu lokalnego - faktura wystawiona 1 listopada o 0:30 należy do serii listopadowej.
        var seriesPrefix = $"FV/{issueDate.ToLocalTime():yyyy}/{issueDate.ToLocalTime():MM}/";

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // Dwie faktury wystawiane w tej samej chwili nie mogą dostać tego samego numeru:
        // blokada zakresu numerów serii trwa do końca transakcji, drugie żądanie czeka i liczy numer po zapisaniu pierwszego
        await LockInvoiceSeriesAsync(seriesPrefix);

        var lastNumber = await _context.Invoices
            .Where(i => i.InvoiceNumber.StartsWith(seriesPrefix))
            .MaxAsync(i => (int?)i.SequenceNumber) ?? 0;
        var sequenceNumber = lastNumber + 1;

        var invoice = new Invoice
        {
            ReservationId = reservationId,
            SequenceNumber = sequenceNumber,
            InvoiceNumber = $"{seriesPrefix}{sequenceNumber:D5}",
            IssueDate = issueDate,
            GrossAmount = reservation.TotalPrice
        };

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return true;
    }

    // Blokada pesymistyczna (SQL Server) na faktury danej serii: UPDLOCK + HOLDLOCK blokuje też wstawianie nowych wierszy
    // w tym zakresie numerów do końca transakcji. Baza w pamięci (testy jednostkowe) nie wykonuje SQL i nie ma blokad.
    private async Task LockInvoiceSeriesAsync(string seriesPrefix)
    {
        if (!_context.Database.IsRelational())
        {
            return;
        }

        var pattern = seriesPrefix + "%";
        await _context.Database.ExecuteSqlAsync($"SELECT InvoiceId FROM Invoices WITH (UPDLOCK, HOLDLOCK) WHERE InvoiceNumber LIKE {pattern}");
    }
}