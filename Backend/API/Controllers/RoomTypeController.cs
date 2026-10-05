using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Constants;
using Services.DTO;
using Services.Interfaces;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = UserRoles.Owner)]
public class RoomTypeController : ControllerBase
{
    private readonly IRoomTypeService _roomTypeService;

    public RoomTypeController(IRoomTypeService roomTypeService)
    {
        _roomTypeService = roomTypeService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var roomTypes = await _roomTypeService.GetAllRoomTypesAsync();
        return Ok(roomTypes);
    }

    // Publiczny profil typu pokoju: zdjęcia, opis, ceny sezonowe, udogodnienia i opinie gości
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDetails(int id)
    {
        var details = await _roomTypeService.GetRoomTypeDetailsAsync(id);
        if (details == null)
            return NotFound(new { error = "Nie znaleziono typu pokoju."});

        return Ok(details);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoomTypeDto dto)
    {
        try
        {
            await _roomTypeService.CreateRoomTypeAsync(dto);
            return Ok(new { message = "Typ pokoju został pomyślnie utworzony."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RoomTypeDto dto)
    {
        try
        {
            var success = await _roomTypeService.UpdateRoomTypeAsync(id, dto);

            if (!success)
                return NotFound(new { error = "Nie znaleziono typu pokoju."});

            return Ok(new { message = "Typ pokoju został zaktualizowany."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var success = await _roomTypeService.DeleteRoomTypeAsync(id);

            if (!success)
                return NotFound(new { error = "Nie znaleziono typu pokoju."});

            return Ok(new { message = "Usunięto typ pokoju!"});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
    }

    // --- ZDJĘCIA TYPU POKOJU ---

    [HttpPost("{id}/photos")]
    [RequestSizeLimit(60 * 1024 * 1024)]
    public async Task<IActionResult> UploadPhotos(int id, [FromForm] List<IFormFile> files)
    {
        // Pliki z formularza przekazujemy do serwisu jako strumienie
        var photos = files.Select(f => new PhotoUploadDto
        {
            FileName = f.FileName,
            Length = f.Length,
            Content = f.OpenReadStream()
        }).ToList();

        try
        {
            var success = await _roomTypeService.AddPhotosAsync(id, photos);

            if (!success)
                return NotFound(new { error = "Nie znaleziono typu pokoju."});

            return Ok(new { message = files.Count == 1 ? "Zdjęcie zostało dodane." : $"Dodano zdjęcia: {files.Count}."});
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message});
        }
        finally
        {
            foreach (var photo in photos)
            {
                await photo.Content.DisposeAsync();
            }
        }
    }

    [HttpDelete("photos/{photoId}")]
    public async Task<IActionResult> DeletePhoto(int photoId)
    {
        var success = await _roomTypeService.DeletePhotoAsync(photoId);

        if (!success)
            return NotFound(new { error = "Nie znaleziono zdjęcia."});

        return Ok(new { message = "Zdjęcie zostało usunięte."});
    }

    // Zdjęcie główne = pierwsze w kolejności (wyświetlane na kafelku na stronie głównej)
    [HttpPut("photos/{photoId}/main")]
    public async Task<IActionResult> SetMainPhoto(int photoId)
    {
        var success = await _roomTypeService.SetMainPhotoAsync(photoId);

        if (!success)
            return NotFound(new { error = "Nie znaleziono zdjęcia."});

        return Ok(new { message = "Ustawiono zdjęcie główne."});
    }
}