using Services.DTO;

namespace Services.Interfaces;

public interface IReservationService
{
    Task<int?> GetAvailableRoomIdAsync(int roomTypeId, DateTime checkIn, DateTime checkOut);
    Task<decimal> CalculateTotalPriceAsync(int roomTypeId, DateTime checkIn, DateTime checkOut, List<int> additionalServiceIds);
    Task<bool> CreateReservationAsync(CreateReservationDto dto);
}