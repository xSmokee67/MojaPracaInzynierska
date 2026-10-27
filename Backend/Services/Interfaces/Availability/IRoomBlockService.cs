using Services.DTO;

namespace Services.Interfaces;

public interface IRoomBlockService
{
    Task<List<RoomBlockDto>> GetAllRoomBlocksAsync(int? roomId);
    // Zwraca rezerwacje przeniesione do innych pokoi, bo nachodziły na blokadę
    Task<List<RelocatedReservationDto>> CreateRoomBlockAsync(RoomBlockDto dto);
    Task<bool> DeleteRoomBlockAsync(int roomBlockId);
}