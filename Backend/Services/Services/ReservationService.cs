using AutoMapper;
using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class ReservationService : IReservationService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IAvailabilityService _availabilityService;

    public ReservationService(ApplicationDbContext context, IMapper mapper, IAvailabilityService availabilityService)
    {
        _context = context;
        _mapper = mapper;
        _availabilityService = availabilityService;
    }

public async Task<int?> GetAvailableRoomIdAsync(int roomTypeId, DateTime checkIn, DateTime checkOut)
    {
        var rooms = await _context.Rooms
            .Include(r => r.Reservations)
            .Include(r => r.RoomBlocks)
            .Where(r => r.RoomTypeId == roomTypeId && r.Status == "available")
            .ToListAsync();

            foreach (var room in rooms)
        {
            bool isReserved = room.Reservations.Any(r =>
            r.Status != "cancelled" &&
            r.CheckInDate < checkOut &&
            r.CheckOutDate > checkIn);

            bool isBlocked = room.RoomBlocks.Any(b =>
            b.StartDate < checkOut &&
            b.EndDate > checkIn);

            if (!isReserved && !isBlocked)
            {
                return room.RoomId;
            }
        }
        return null;
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

        for(var date = checkIn.Date; date< checkOut.Date; date = date.AddDays(1))
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
        var availableRoomId = await GetAvailableRoomIdAsync(dto.RoomTypeId, dto.CheckInDate, dto.CheckOutDate);
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

        foreach(var service in services)
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

        await _availabilityService.UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, "booked");

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
        var allowedStatuses = new[] { "pending", "confirmed", "cancelled", "completed", "no-show" };
        if (!allowedStatuses.Contains(status))
        {
            throw new ArgumentException("Nieprawidłowy status rezerwacji.");
        }

        var reservation = await _context.Reservations.FindAsync(reservationId);
        if (reservation == null)
        {
            return false;
        }

        if (reservation.Status == "cancelled" && status != "cancelled")
        {
            throw new ArgumentException("Nie można przywrócić anulowanej rezerwacji, termin mógł zostać już zajęty.");
        }

        var wasCancelled = reservation.Status != "cancelled" && status == "cancelled";

        reservation.Status = status;
        await _context.SaveChangesAsync();

        if (wasCancelled)
        {
            await _availabilityService.UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, "free");
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

        if (reservation.Status != "pending" && reservation.Status != "confirmed")
        {
            throw new ArgumentException("Można anulować tylko rezerwację oczekującą lub potwierdzoną.");
        }

        if (reservation.CheckInDate.Date <= DateTime.Today)
        {
            throw new ArgumentException("Rezerwację można anulować najpóźniej dzień przed zameldowaniem.");
        }

        reservation.Status = "cancelled";
        await _context.SaveChangesAsync();

        await _availabilityService.UpdateAvailabilityAsync(reservation.RoomId, reservation.CheckInDate, reservation.CheckOutDate, "free");

        return true;
    }

    public async Task<bool> RegisterPaymentAsync(int reservationId, PaymentDto dto)
    {
        var allowedMethods = new[] { "card", "transfer", "cash", "BLIK" };
        if (!allowedMethods.Contains(dto.Method))
        {
            throw new ArgumentException("Nieprawidłowa metoda płatności.");
        }

        var allowedStatuses = new[] { "pending", "completed", "failed", "refunded" };
        var status = string.IsNullOrWhiteSpace(dto.Status) ? "completed" : dto.Status;
        if (!allowedStatuses.Contains(status))
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

        if (reservation.Status == "cancelled" && status != "refunded")
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

        if (reservation.Status != "completed")
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