using DAL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;
using Services.Interfaces;

namespace API.Controllers;
[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Owner")]
public class RoomTypeController : ControllerBase
{
    private const int MaxPhotosPerRoomType = 10;
    private const string PhotoFolder = "room-types";

    private readonly ApplicationDbContext _context;
    private readonly IFileStorageService _fileStorage;

    public RoomTypeController(ApplicationDbContext context, IFileStorageService fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
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

        return Ok(roomTypes);
    }

    // Publiczny profil typu pokoju: zdjęcia, opis, ceny sezonowe, udogodnienia i opinie gości
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDetails(int id)
    {
        var roomType = await _context.RoomTypes
            .Include(rt => rt.Photos)
            .Include(rt => rt.PriceListEntries)
            .Include(rt => rt.Rooms)
                .ThenInclude(r => r.Amenities)
            .FirstOrDefaultAsync(rt => rt.RoomTypeId == id);

        if (roomType == null)
            return NotFound(new { error = "Nie znaleziono typu pokoju."});

        var reviews = await _context.Reviews
            .Include(r => r.Guest)
            .Where(r => r.Reservation.Room.RoomTypeId == id)
            .OrderByDescending(r => r.Date)
            .ToListAsync();

        var details = new RoomTypeDetailsDto
        {
            RoomTypeId = roomType.RoomTypeId,
            Name = roomType.Name,
            Description = roomType.Description,
            BasePrice = roomType.BasePrice,
            MaxOccupancy = roomType.MaxOccupancy,
            RoomCount = roomType.Rooms.Count(r => r.Status != "disabled"),
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

        return Ok(details);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoomTypeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Nazwa typu pokoju jest wymagana."});

        if (dto.BasePrice <= 0 || dto.MaxOccupancy <= 0)
            return BadRequest(new { error = "Cena bazowa i maksymalna liczba gości muszą być większe od zera."});

        var roomType = new RoomType
        {
            Name = dto.Name,
            Description = dto.Description,
            BasePrice  = dto.BasePrice,
            MaxOccupancy = dto.MaxOccupancy
        };

        _context.RoomTypes.Add(roomType);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Typ pokoju został pomyślnie utworzony."});
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RoomTypeDto dto)
    {
        var roomType = await _context.RoomTypes.FindAsync(id);
        if (roomType == null)
            return NotFound(new { error = "Nie znaleziono typu pokoju."});

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Nazwa typu pokoju jest wymagana."});

        if (dto.BasePrice <= 0 || dto.MaxOccupancy <= 0)
            return BadRequest(new { error = "Cena bazowa i maksymalna liczba gości muszą być większe od zera."});

            roomType.Name = dto.Name;
            roomType.Description = dto.Description;
            roomType.BasePrice = dto.BasePrice;
            roomType.MaxOccupancy = dto.MaxOccupancy;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Typ pokoju został zaaktualizowany."});
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete (int id)
    {
        var roomType = await _context.RoomTypes.Include(rt => rt.Photos).FirstOrDefaultAsync(rt => rt.RoomTypeId == id);
        if (roomType == null)
        return NotFound("Nie znaleziono typu pokoju.");

        bool hasRooms = await _context.Rooms.AnyAsync(r => r.RoomTypeId == id);
        if (hasRooms)
        return BadRequest(new { error = "Nie można usunąć typu pokoju, posiada on przypisane pokoje do siebie!"});

        var photoUrls = roomType.Photos.Select(p => p.PhotoUrl).ToList();

        _context.RoomTypes.Remove(roomType);
        await _context.SaveChangesAsync();

        foreach (var url in photoUrls)
        {
            _fileStorage.Delete(url);
        }

        return Ok(new {message = "Usunięto typ pokoju!"});
    }

    // --- ZDJĘCIA TYPU POKOJU ---

    [HttpPost("{id}/photos")]
    [RequestSizeLimit(60 * 1024 * 1024)]
    public async Task<IActionResult> UploadPhotos(int id, [FromForm] List<IFormFile> files)
    {
        var roomType = await _context.RoomTypes.Include(rt => rt.Photos).FirstOrDefaultAsync(rt => rt.RoomTypeId == id);
        if (roomType == null)
            return NotFound(new { error = "Nie znaleziono typu pokoju."});

        if (files.Count == 0)
            return BadRequest(new { error = "Wybierz co najmniej jedno zdjęcie."});

        if (roomType.Photos.Count + files.Count > MaxPhotosPerRoomType)
            return BadRequest(new { error = $"Typ pokoju może mieć maksymalnie {MaxPhotosPerRoomType} zdjęć (obecnie: {roomType.Photos.Count})."});

        // Najpierw walidacja wszystkich plików - żeby nie zapisać połowy zestawu
        try
        {
            foreach (var file in files)
            {
                _fileStorage.ValidateImage(file.FileName, file.Length);
            }
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }

        var nextSortOrder = roomType.Photos.Count == 0 ? 0 : roomType.Photos.Max(p => p.SortOrder) + 1;
        foreach (var file in files)
        {
            await using var stream = file.OpenReadStream();
            var url = await _fileStorage.SaveImageAsync(stream, file.FileName, PhotoFolder);

            roomType.Photos.Add(new RoomTypePhoto { PhotoUrl = url, SortOrder = nextSortOrder++ });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = files.Count == 1 ? "Zdjęcie zostało dodane." : $"Dodano zdjęcia: {files.Count}."});
    }

    [HttpDelete("photos/{photoId}")]
    public async Task<IActionResult> DeletePhoto(int photoId)
    {
        var photo = await _context.RoomTypePhotos.FindAsync(photoId);
        if (photo == null)
            return NotFound(new { error = "Nie znaleziono zdjęcia."});

        _context.RoomTypePhotos.Remove(photo);
        await _context.SaveChangesAsync();
        _fileStorage.Delete(photo.PhotoUrl);

        return Ok(new { message = "Zdjęcie zostało usunięte."});
    }

    // Zdjęcie główne = pierwsze w kolejności (wyświetlane na kafelku na stronie głównej)
    [HttpPut("photos/{photoId}/main")]
    public async Task<IActionResult> SetMainPhoto(int photoId)
    {
        var photo = await _context.RoomTypePhotos.FindAsync(photoId);
        if (photo == null)
            return NotFound(new { error = "Nie znaleziono zdjęcia."});

        var minSortOrder = await _context.RoomTypePhotos
            .Where(p => p.RoomTypeId == photo.RoomTypeId)
            .MinAsync(p => p.SortOrder);

        photo.SortOrder = minSortOrder - 1;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Ustawiono zdjęcie główne."});
    }

}