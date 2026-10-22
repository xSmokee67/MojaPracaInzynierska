using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class AdditionalServiceService : IAdditionalServiceService
{
    private readonly ApplicationDbContext _context;

    public AdditionalServiceService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AdditionalServiceDto>> GetAllAdditionalServicesAsync()
    {
        return await _context.AdditionalServices.Select(s => new AdditionalServiceDto
        {
            ServiceId = s.ServiceId,
            Name = s.Name,
            Price = s.Price
        }).ToListAsync();
    }

    public async Task CreateAdditionalServiceAsync(AdditionalServiceDto dto)
    {
        ValidateAdditionalService(dto);

        var service = new AdditionalService
        {
            Name = dto.Name,
            Price = dto.Price
        };

        _context.AdditionalServices.Add(service);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> UpdateAdditionalServiceAsync(int serviceId, AdditionalServiceDto dto)
    {
        var service = await _context.AdditionalServices.FindAsync(serviceId);
        if (service == null)
        {
            return false;
        }

        ValidateAdditionalService(dto);

        service.Name = dto.Name;
        service.Price = dto.Price;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAdditionalServiceAsync(int serviceId)
    {
        var service = await _context.AdditionalServices.FindAsync(serviceId);
        if (service == null)
        {
            return false;
        }

        _context.AdditionalServices.Remove(service);
        await _context.SaveChangesAsync();
        return true;
    }

    private static void ValidateAdditionalService(AdditionalServiceDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Nazwa usługi jest wymagana.");
        }

        if (dto.Price <= 0)
        {
            throw new ArgumentException("Cena usługi musi być większa od zera.");
        }
    }
}