using Services.Interfaces;
using Services.Settings;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Services.Services;

// Zapis zdjęć na dysku serwera - pliki dostają losowe nazwy, a API udostępnia je pod adresem RequestPath
public class FileStorageService : IFileStorageService
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

    // Dłuższy bok zapisanego zdjęcia - zdjęcia z aparatu (np. 6000 px, 5 MB) są zmniejszane, żeby galeria ładowała się szybko
    public const int MaxImageDimension = 1600;

    private readonly FileStorageSettings _settings;

    public FileStorageService(FileStorageSettings settings)
    {
        _settings = settings;
    }

    public void ValidateImage(string fileName, long length)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"Plik \"{fileName}\" ma nieobsługiwany format. Dozwolone: JPG, PNG, WEBP.");
        }

        if (length <= 0)
        {
            throw new ArgumentException($"Plik \"{fileName}\" jest pusty.");
        }

        if (length > _settings.MaxFileSizeBytes)
        {
            throw new ArgumentException($"Plik \"{fileName}\" jest za duży. Maksymalny rozmiar to {_settings.MaxFileSizeBytes / (1024 * 1024)} MB.");
        }
    }

    // Zapisuje zdjęcie i zwraca jego adres, np. /uploads/room-types/3f2a...c1.jpg.
    // Plik jest odczytywany jako obraz (plik o innej zawartości, np. skrypt z rozszerzeniem .jpg, jest odrzucany),
    // obracany zgodnie z orientacją z aparatu, zmniejszany do MaxImageDimension i zapisywany bez metadanych EXIF
    // (np. lokalizacji GPS z telefonu).
    public async Task<string> SaveImageAsync(Stream content, string fileName, string folder)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();

        Image image;
        try
        {
            image = await Image.LoadAsync(content);
        }
        catch (ImageFormatException)
        {
            throw new ArgumentException($"Plik \"{fileName}\" nie jest prawidłowym obrazem.");
        }

        using (image)
        {
            image.Mutate(x => x.AutoOrient());

            if (image.Width > MaxImageDimension || image.Height > MaxImageDimension)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(MaxImageDimension, MaxImageDimension)
                }));
            }

            image.Metadata.ExifProfile = null;

            var storedName = $"{Guid.NewGuid():N}{extension}";
            var directory = Path.Combine(_settings.RootPath, folder);
            Directory.CreateDirectory(directory);

            await image.SaveAsync(Path.Combine(directory, storedName), EncoderFor(extension));

            return $"{_settings.RequestPath}/{folder}/{storedName}";
        }
    }

    // Zapis w formacie zgodnym z rozszerzeniem pliku (jakość 85 - dobra przy niewielkim rozmiarze)
    private static IImageEncoder EncoderFor(string extension) => extension switch
    {
        ".png" => new PngEncoder(),
        ".webp" => new WebpEncoder { Quality = 85 },
        _ => new JpegEncoder { Quality = 85 }
    };

    public void Delete(string fileUrl)
    {
        if (!fileUrl.StartsWith(_settings.RequestPath + "/"))
        {
            return;
        }

        var relativePath = fileUrl.Substring(_settings.RequestPath.Length + 1);
        var root = Path.GetFullPath(_settings.RootPath);
        var fullPath = Path.GetFullPath(Path.Combine(root, relativePath));

        // Ochrona przed usunięciem pliku spoza katalogu z uploadami (np. "../appsettings.json")
        if (!fullPath.StartsWith(root + Path.DirectorySeparatorChar))
        {
            return;
        }

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }
}