using Services.DTO;

namespace Services.Interfaces;

public interface IReservationService
{
    Task<int?> GetAvailableRoomIdAsync(int roomTypeId, DateTime checkIn, DateTime checkOut);
    Task<List<int>> GetAvailableRoomIdsAsync(int roomTypeId, DateTime checkIn, DateTime checkOut);
    Task<List<RoomTypeAvailabilityDto>> SearchRoomTypesAsync(DateTime checkIn, DateTime checkOut, int guests);
    Task<decimal> CalculateTotalPriceAsync(int roomTypeId, DateTime checkIn, DateTime checkOut, List<int> additionalServiceIds);
    Task<bool> CreateReservationAsync(CreateReservationDto dto);
    Task<List<ReservationDto>> GetGuestReservationsAsync(int guestId);
    Task<List<ReservationDto>> GetAllReservationsAsync();
    Task<bool> UpdateReservationStatusAsync(int reservationId, string status);
    Task<ReservationDetailsDto?> GetReservationDetailsAsync(int reservationId);
    Task<bool> CancelReservationByGuestAsync(int reservationId, int guestId);
    Task<bool> RegisterPaymentAsync(int reservationId, PaymentDto dto);
    Task<bool> IssueInvoiceAsync(int reservationId);
}