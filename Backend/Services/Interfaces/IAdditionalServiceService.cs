using Services.DTO;

namespace Services.Interfaces;

public interface IAdditionalServiceService
{
    Task<List<AdditionalServiceDto>> GetAllAdditionalServicesAsync();
    Task CreateAdditionalServiceAsync(AdditionalServiceDto dto);
    Task<bool> UpdateAdditionalServiceAsync(int serviceId, AdditionalServiceDto dto);
    Task<bool> DeleteAdditionalServiceAsync(int serviceId);
}