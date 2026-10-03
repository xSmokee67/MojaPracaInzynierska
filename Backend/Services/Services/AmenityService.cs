using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class AmenityService : IAmenityService
{
    private readonly ApplicationDbContext _context;

    public AmenityService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AmenityDto>> GetAllAmenitiesAsync()
    {
        return await _context.Amenities.Select(a => new AmenityDto
        {
            AmenityId = a.AmenityId,
            Name = a.Name
        }).ToListAsync();
    }

    public async Task CreateAmenityAsync(AmenityDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Nazwa udogodnienia jest wymagana.");
        }

        var nameTaken = await _context.Amenities.AnyAsync(a => a.Name == dto.Name);
        if (nameTaken)
        {
            throw new ArgumentException("Udogodnienie o takiej nazwie już istnieje.");
        }

        var amenity = new Amenity
        {
            Name = dto.Name
        };

        _context.Amenities.Add(amenity);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> UpdateAmenityAsync(int amenityId, AmenityDto dto)
    {
        var amenity = await _context.Amenities.FindAsync(amenityId);
        if (amenity == null)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Nazwa udogodnienia jest wymagana.");
        }

        var nameTaken = await _context.Amenities.AnyAsync(a => a.Name == dto.Name && a.AmenityId != amenityId);
        if (nameTaken)
        {
            throw new ArgumentException("Udogodnienie o takiej nazwie już istnieje.");
        }

        amenity.Name = dto.Name;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAmenityAsync(int amenityId)
    {
        var amenity = await _context.Amenities.FindAsync(amenityId);
        if (amenity == null)
        {
            return false;
        }

        _context.Amenities.Remove(amenity);
        await _context.SaveChangesAsync();
        return true;
    }
}