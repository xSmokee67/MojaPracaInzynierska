using Services.DTO;

namespace Services.Interfaces;

public interface IAmenityService
{
    Task<List<AmenityDto>> GetAllAmenitiesAsync();
    Task CreateAmenityAsync(AmenityDto dto);
    Task<bool> UpdateAmenityAsync(int amenityId, AmenityDto dto);
    Task<bool> DeleteAmenityAsync(int amenityId);
}