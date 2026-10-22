using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class RoomTypeService : IRoomTypeService
{
    private const int MaxPhotosPerRoomType = 10;
    private const string PhotoFolder = "room-types";

    private readonly ApplicationDbContext _context;
    private readonly IFileStorageService _fileStorage;

    public RoomTypeService(ApplicationDbContext context, IFileStorageService fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    public async Task<List<RoomTypeDto>> GetAllRoomTypesAsync()
    {
        var roomTypes = await _context.RoomTypes.Select(rt => new RoomTypeDto
        {
            RoomTypeId = rt.RoomTypeId,
            Name = rt.Name,
            Description = rt.Description,
            BasePrice = rt.BasePrice,
            MaxOccupancy = rt.MaxOccupancy,
            MainPhotoUrl = rt.Photos.OrderBy(p => p.SortOrder).Select(p => p.PhotoUrl).FirstOrDefault(),
            PhotoCount = rt.Photos.Count
        })
        .ToListAsync();

        // Średnia ocena z opinii gości dla każdego typu pokoju (do kafelków na stronie głównej)
        var ratings = await _context.Reviews
            .GroupBy(r => r.Reservation.Room.RoomTypeId)
            .Select(g => new { RoomTypeId = g.Key, Average = g.Average(r => r.Rating), Count = g.Count() })
            .ToListAsync();

        // Udogodnienia pokoi w użytku, zebrane per typ pokoju
        var amenities = await _context.Rooms
            .Where(r => r.Status != RoomStatus.Disabled)
            .SelectMany(r => r.Amenities, (room, amenity) => new { room.RoomTypeId, amenity.Name })
            .Distinct()
            .ToListAsync();

        foreach (var roomType in roomTypes)
        {
            var rating = ratings.FirstOrDefault(r => r.RoomTypeId == roomType.RoomTypeId);
            roomType.AverageRating = rating != null ? Math.Round(rating.Average, 1) : null;
            roomType.ReviewCount = rating?.Count ?? 0;
            roomType.Amenities = amenities.Where(a => a.RoomTypeId == roomType.RoomTypeId).Select(a => a.Name).OrderBy(name => name).ToList();
        }

        return roomTypes;
    }

    // Publiczny profil typu pokoju: zdjęcia, opis, ceny sezonowe, udogodnienia i opinie gości
    public async Task<RoomTypeDetailsDto?> GetRoomTypeDetailsAsync(int roomTypeId)
    {
        var roomType = await _context.RoomTypes
            .Include(rt => rt.Photos)
            .Include(rt => rt.PriceListEntries)
            .Include(rt => rt.Rooms)
                .ThenInclude(r => r.Amenities)
            .FirstOrDefaultAsync(rt => rt.RoomTypeId == roomTypeId);

        if (roomType == null)
        {
            return null;
        }

        var reviews = await _context.Reviews
            .Include(r => r.Guest)
            .Where(r => r.Reservation.Room.RoomTypeId == roomTypeId)
            .OrderByDescending(r => r.Date)
            .ToListAsync();

        return new RoomTypeDetailsDto
        {
            RoomTypeId = roomType.RoomTypeId,
            Name = roomType.Name,
            Description = roomType.Description,
            BasePrice = roomType.BasePrice,
            MaxOccupancy = roomType.MaxOccupancy,
            RoomCount = roomType.Rooms.Count(r => r.Status != RoomStatus.Disabled),
            Photos = roomType.Photos
                .OrderBy(p => p.SortOrder)
                .Select(p => new RoomTypePhotoDto { RoomTypePhotoId = p.RoomTypePhotoId, PhotoUrl = p.PhotoUrl, SortOrder = p.SortOrder })
                .ToList(),
            Amenities = roomType.Rooms
                .SelectMany(r => r.Amenities)
                .Select(a => a.Name)
                .Distinct()
                .OrderBy(name => name)
                .ToList(),
            SeasonalPrices = roomType.PriceListEntries
                .Where(p => p.EndDate.Date >= DateTime.Today)
                .OrderBy(p => p.StartDate)
                .Select(p => new PriceListEntryDto { PriceListEntryId = p.PriceListEntryId, RoomTypeId = p.RoomTypeId, RoomTypeName = roomType.Name, StartDate = p.StartDate, EndDate = p.EndDate, PricePerNight = p.PricePerNight })
                .ToList(),
            AverageRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : null,
            ReviewCount = reviews.Count,
            // Na publicznej stronie tylko imię i inicjał nazwiska gościa
            LatestReviews = reviews.Take(3).Select(r => new ReviewDto
            {
                ReviewId = r.ReviewId,
                GuestName = r.Guest.LastName.Length > 0 ? $"{r.Guest.FirstName} {r.Guest.LastName[0]}." : r.Guest.FirstName,
                ReservationId = r.ReservationId,
                RoomTypeName = roomType.Name,
                Rating = r.Rating,
                Comment = r.Comment,
                Date = r.Date
            }).ToList()
        };
    }

    public async Task CreateRoomTypeAsync(RoomTypeDto dto)
    {
        ValidateRoomType(dto);

        var roomType = new RoomType
        {
            Name = dto.Name,
            Description = dto.Description,
            BasePrice = dto.BasePrice,
            MaxOccupancy = dto.MaxOccupancy
        };

        _context.RoomTypes.Add(roomType);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> UpdateRoomTypeAsync(int roomTypeId, RoomTypeDto dto)
    {
        var roomType = await _context.RoomTypes.FindAsync(roomTypeId);
        if (roomType == null)
        {
            return false;
        }

        ValidateRoomType(dto);

        roomType.Name = dto.Name;
        roomType.Description = dto.Description;
        roomType.BasePrice = dto.BasePrice;
        roomType.MaxOccupancy = dto.MaxOccupancy;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteRoomTypeAsync(int roomTypeId)
    {
        var roomType = await _context.RoomTypes.Include(rt => rt.Photos).FirstOrDefaultAsync(rt => rt.RoomTypeId == roomTypeId);
        if (roomType == null)
        {
            return false;
        }

        bool hasRooms = await _context.Rooms.AnyAsync(r => r.RoomTypeId == roomTypeId);
        if (hasRooms)
        {
            throw new ArgumentException("Nie można usunąć typu pokoju, posiada on przypisane pokoje do siebie!");
        }

        var photoUrls = roomType.Photos.Select(p => p.PhotoUrl).ToList();

        _context.RoomTypes.Remove(roomType);
        await _context.SaveChangesAsync();

        // Pliki usuwamy z dysku dopiero po udanym zapisie w bazie
        foreach (var url in photoUrls)
        {
            _fileStorage.Delete(url);
        }

        return true;
    }

    // --- ZDJĘCIA TYPU POKOJU ---

    public async Task<bool> AddPhotosAsync(int roomTypeId, List<PhotoUploadDto> photos)
    {
        var roomType = await _context.RoomTypes.Include(rt => rt.Photos).FirstOrDefaultAsync(rt => rt.RoomTypeId == roomTypeId);
        if (roomType == null)
        {
            return false;
        }

        if (photos.Count == 0)
        {
            throw new ArgumentException("Wybierz co najmniej jedno zdjęcie.");
        }

        if (roomType.Photos.Count + photos.Count > MaxPhotosPerRoomType)
        {
            throw new ArgumentException($"Typ pokoju może mieć maksymalnie {MaxPhotosPerRoomType} zdjęć (obecnie: {roomType.Photos.Count}).");
        }

        // Najpierw walidacja wszystkich plików - żeby nie zapisać połowy zestawu
        foreach (var photo in photos)
        {
            _fileStorage.ValidateImage(photo.FileName, photo.Length);
        }

        var nextSortOrder = roomType.Photos.Count == 0 ? 0 : roomType.Photos.Max(p => p.SortOrder) + 1;
        foreach (var photo in photos)
        {
            var url = await _fileStorage.SaveImageAsync(photo.Content, photo.FileName, PhotoFolder);

            roomType.Photos.Add(new RoomTypePhoto { PhotoUrl = url, SortOrder = nextSortOrder++ });
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeletePhotoAsync(int photoId)
    {
        var photo = await _context.RoomTypePhotos.FindAsync(photoId);
        if (photo == null)
        {
            return false;
        }

        _context.RoomTypePhotos.Remove(photo);
        await _context.SaveChangesAsync();
        _fileStorage.Delete(photo.PhotoUrl);

        return true;
    }

    // Zdjęcie główne = pierwsze w kolejności (wyświetlane na kafelku na stronie głównej)
    public async Task<bool> SetMainPhotoAsync(int photoId)
    {
        var photo = await _context.RoomTypePhotos.FindAsync(photoId);
        if (photo == null)
        {
            return false;
        }

        var minSortOrder = await _context.RoomTypePhotos
            .Where(p => p.RoomTypeId == photo.RoomTypeId)
            .MinAsync(p => p.SortOrder);

        photo.SortOrder = minSortOrder - 1;
        await _context.SaveChangesAsync();

        return true;
    }

    private static void ValidateRoomType(RoomTypeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Nazwa typu pokoju jest wymagana.");
        }

        if (dto.BasePrice <= 0 || dto.MaxOccupancy <= 0)
        {
            throw new ArgumentException("Cena bazowa i maksymalna liczba gości muszą być większe od zera.");
        }
    }
}