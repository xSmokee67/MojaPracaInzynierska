using Services.DTO;

namespace Services.Interfaces;

public interface IPriceListEntryService
{
    Task<List<PriceListEntryDto>> GetAllPriceListEntriesAsync();
    Task CreatePriceListEntryAsync(PriceListEntryDto dto);
    Task<bool> UpdatePriceListEntryAsync(int priceListEntryId, PriceListEntryDto dto);
    Task<bool> DeletePriceListEntryAsync(int priceListEntryId);
}