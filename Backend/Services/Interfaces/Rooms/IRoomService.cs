using Services.DTO;

namespace Services.Interfaces;

public interface IRoomService
{
    Task<List<RoomDto>> GetAllRoomsAsync();
    Task CreateRoomAsync(RoomDto dto);
    Task<bool> UpdateRoomAsync(int roomId, RoomDto dto);
    Task<bool> DeleteRoomAsync(int roomId);
}