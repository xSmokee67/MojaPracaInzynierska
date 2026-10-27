using Services.DTO;

namespace Services.Interfaces;

public interface IRoomService
{
    Task<List<RoomDto>> GetAllRoomsAsync();
    Task CreateRoomAsync(RoomDto dto);
    // null - pokój nie istnieje; lista - rezerwacje przeniesione do innych pokoi (remont, wyłączenie, zmiana typu)
    Task<List<RelocatedReservationDto>?> UpdateRoomAsync(int roomId, RoomDto dto);
    Task<bool> DeleteRoomAsync(int roomId);
}