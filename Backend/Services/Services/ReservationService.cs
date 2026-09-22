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

    public ReservationService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
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

        foreach(var serviceId in dto.AdditionalServiceIds)
        {
            reservation.ReservationServices.Add(new Model.ReservationService
            {
                ServiceId = serviceId,
                Quantity = 1
            });
        }

        await _context.Reservations.AddAsync(reservation);
        await _context.SaveChangesAsync();

        return true;
    }
}