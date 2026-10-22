using Services.DTO;

namespace Services.Interfaces;

public interface IRoomBlockService
{
    Task<List<RoomBlockDto>> GetAllRoomBlocksAsync(int? roomId);
    Task CreateRoomBlockAsync(RoomBlockDto dto);
    Task<bool> DeleteRoomBlockAsync(int roomBlockId);
}