using AutoMapper;
using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;
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

    // Termin w treści powiadomień, np. "10.11.2026 - 13.11.2026"
    private static string StayDates(DateTime checkIn, DateTime checkOut) => $"{checkIn:dd.MM.yyyy} - {checkOut:dd.MM.yyyy}";

    // Komunikaty dla gościa po zmianie statusu przez hotel
    private static readonly Dictionary<string, string> StatusMessages = new()
    {
        [ReservationStatus.Confirmed] = "została potwierdzona przez hotel.",
        [ReservationStatus.Cancelled] = "została anulowana przez hotel.",
        [ReservationStatus.Completed] = "została zakończona. Możesz wystawić opinię o pobycie.",
        [ReservationStatus.NoShow] = "została oznaczona jako niestawienie się.",
        [ReservationStatus.Pending] = "oczekuje ponownie na potwierdzenie."
    };

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

    public async Task<decimal> CalculateTotalPriceAsync(int roomTypeId, DateTime checkIn, DateTime checkOut, List<int> additionalServiceIds)
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

        decimal additionalServicesPrice = 0;
        if (additionalServiceIds.Any())
        {
            var services = await _context.AdditionalServices
                .Where(s => additionalServiceIds.Contains(s.ServiceId))
                .ToListAsync();

            additionalServicesPrice = services.Sum(s => s.Price);
        }

        return totalRoomPrice + additionalServicesPrice;
    }

    public async Task<bool> CreateReservationAsync(CreateReservationDto dto)
    {
        // Sprawdzenie dostępności i zapis rezerwacji w jednej transakcji: dwóch gości nie dostanie tego samego pokoju,
        // a rezerwacja i kalendarz dostępności zapisują się razem albo wcale (bez commita transakcja jest wycofywana)
        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _availabilityService.LockRoomTypeAsync(dto.RoomTypeId);

        var availableRoomId = await _availabilityService.GetAvailableRoomIdAsync(dto.RoomTypeId, dto.CheckInDate, dto.CheckOutDate);
        if (availableRoomId == null)
        {
            return false;
        }

        var totalPrice = await CalculateTotalPriceAsync(dto.RoomTypeId, dto.CheckInDate, dto.CheckOutDate, dto.AdditionalServiceIds);

        var reservation = _mapper.Map<Reservation>(dto);
        reservation.RoomId = availableRoomId.Value;
        reservation.TotalPrice = totalPrice;

        var services = await _context.AdditionalServices
            .Where(s => dto.AdditionalServiceIds.Contains(s.ServiceId))
            .ToListAsync();

        foreach (var service in services)
        {
            reservation.ReservationServices.Add(new Model.ReservationService
            {
                ServiceId = service.ServiceId,
                Quantity = 1,
                TotalPrice = service.Price
            });
        }

        await _context.Reservations.AddAsync(reservation);
        await _context.SaveChangesAsync();

        await _availabilityService.UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, AvailabilityStatus.Booked);

        var roomTypeName = await _context.RoomTypes.Where(rt => rt.RoomTypeId == dto.RoomTypeId).Select(rt => rt.Name).FirstAsync();
        await _notificationService.NotifyOwnersAsync($"Nowa rezerwacja #{reservation.ReservationId}: {roomTypeName}, {StayDates(reservation.CheckInDate, reservation.CheckOutDate)}.", reservation.ReservationId);

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

        if (reservation.Status == ReservationStatus.Cancelled && status != ReservationStatus.Cancelled)
        {
            throw new ArgumentException("Nie można przywrócić anulowanej rezerwacji, termin mógł zostać już zajęty.");
        }

        var wasCancelled = reservation.Status != ReservationStatus.Cancelled && status == ReservationStatus.Cancelled;
        var statusChanged = reservation.Status != status;

        reservation.Status = status;
        await _context.SaveChangesAsync();

        if (wasCancelled)
        {
            await _availabilityService.UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, AvailabilityStatus.Free);
        }

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

        await _availabilityService.UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, AvailabilityStatus.Free);

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

        // Nowa cena: noclegi według cennika w nowym terminie + usługi dodatkowe w cenach z chwili rezerwacji
        var roomPrice = await CalculateTotalPriceAsync(roomTypeId, newCheckIn, newCheckOut, new List<int>());
        var servicesPrice = reservation.ReservationServices.Sum(s => s.TotalPrice);

        // Kalendarz dostępności: zwolnienie starych nocy, potem zajęcie nowych
        await _availabilityService.UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, AvailabilityStatus.Free);

        reservation.RoomId = newRoomId;
        reservation.CheckInDate = newCheckIn;
        reservation.CheckOutDate = newCheckOut;
        reservation.TotalPrice = roomPrice + servicesPrice;
        await _context.SaveChangesAsync();

        await _availabilityService.UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, AvailabilityStatus.Booked);

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

        var invoice = new Invoice
        {
            ReservationId = reservationId,
            InvoiceNumber = $"FV/{issueDate:yyyy}/{issueDate:MM}/{reservationId:D5}",
            IssueDate = issueDate,
            GrossAmount = reservation.TotalPrice
        };

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        return true;
    }
}