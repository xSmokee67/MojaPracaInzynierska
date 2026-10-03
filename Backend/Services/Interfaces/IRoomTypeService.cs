using Services.DTO;

namespace Services.Interfaces;

public interface IRoomTypeService
{
    Task<List<RoomTypeDto>> GetAllRoomTypesAsync();
    Task<RoomTypeDetailsDto?> GetRoomTypeDetailsAsync(int roomTypeId);
    Task CreateRoomTypeAsync(RoomTypeDto dto);
    Task<bool> UpdateRoomTypeAsync(int roomTypeId, RoomTypeDto dto);
    Task<bool> DeleteRoomTypeAsync(int roomTypeId);
    Task<bool> AddPhotosAsync(int roomTypeId, List<PhotoUploadDto> photos);
    Task<bool> DeletePhotoAsync(int photoId);
    Task<bool> SetMainPhotoAsync(int photoId);
}