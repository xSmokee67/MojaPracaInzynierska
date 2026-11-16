using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;
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
            Price = s.Price,
            ChargeType = s.ChargeType,
            IsActive = s.IsActive
        }).ToListAsync();
    }

    public async Task CreateAdditionalServiceAsync(AdditionalServiceDto dto)
    {
        ValidateAdditionalService(dto);

        var service = new AdditionalService
        {
            Name = dto.Name,
            Price = dto.Price,
            ChargeType = dto.ChargeType,
            IsActive = dto.IsActive
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
        service.ChargeType = dto.ChargeType;
        service.IsActive = dto.IsActive;

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

        // Usługa zamówiona choć raz jest częścią historii rezerwacji (rozliczenie, faktura) - nie można jej usunąć,
        // można ją tylko wycofać z oferty
        if (await _context.ReservationServices.AnyAsync(rs => rs.ServiceId == serviceId))
        {
            throw new ArgumentException("Tej usługi nie można usunąć, bo była już zamawiana w rezerwacjach. Zamiast usuwać, wycofaj ją z oferty (odznacz „Dostępna w ofercie”).");
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

        if (!ServiceChargeType.All.Contains(dto.ChargeType))
        {
            throw new ArgumentException("Nieprawidłowy sposób naliczania usługi.");
        }
    }
}