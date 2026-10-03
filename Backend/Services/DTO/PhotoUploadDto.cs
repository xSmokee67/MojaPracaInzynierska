namespace Services.DTO;

// Zdjęcie przesłane przez formularz - kontroler przekazuje do serwisu sam strumień,
// dzięki czemu warstwa Services nie zależy od typów ASP.NET Core (IFormFile)
public class PhotoUploadDto
{
    public string FileName {get; set; } = string.Empty;
    public long Length {get; set; }
    public Stream Content {get; set; } = Stream.Null;
}