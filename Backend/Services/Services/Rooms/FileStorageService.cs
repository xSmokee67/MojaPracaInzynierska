using Services.Interfaces;
using Services.Settings;

namespace Services.Services;

// Zapis zdjęć na dysku serwera - pliki dostają losowe nazwy, a API udostępnia je pod adresem RequestPath
public class FileStorageService : IFileStorageService
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

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
    // Zawartość pliku musi zaczynać się sygnaturą formatu z rozszerzenia (pierwsze bajty JPG / PNG / WEBP) -
    // plik o innej zawartości, np. program przemianowany na .jpg, jest odrzucany i nie trafia na dysk.
    // Zmniejszanie zdjęć i usuwanie metadanych EXIF wykonuje przeglądarka przed wysłaniem (utils/resizeImage.js).
    public async Task<string> SaveImageAsync(Stream content, string fileName, string folder)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();

        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer);
        if (!HasImageSignature(buffer.GetBuffer().AsSpan(0, (int)buffer.Length), extension))
        {
            throw new ArgumentException($"Plik \"{fileName}\" nie jest prawidłowym obrazem {extension.TrimStart('.').ToUpperInvariant()}.");
        }

        var storedName = $"{Guid.NewGuid():N}{extension}";
        var directory = Path.Combine(_settings.RootPath, folder);
        Directory.CreateDirectory(directory);

        await File.WriteAllBytesAsync(Path.Combine(directory, storedName), buffer.ToArray());

        return $"{_settings.RequestPath}/{folder}/{storedName}";
    }

    // Sygnatury formatów (tzw. magic numbers): JPEG zaczyna się od FF D8 FF, PNG od 89 50 4E 47 0D 0A 1A 0A,
    // WEBP od "RIFF" i ma "WEBP" na bajtach 8-11
    private static bool HasImageSignature(ReadOnlySpan<byte> header, string extension) => extension switch
    {
        ".jpg" or ".jpeg" => header.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }),
        ".png" => header.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
        ".webp" => header.Length >= 12 && header.StartsWith("RIFF"u8) && header.Slice(8, 4).SequenceEqual("WEBP"u8),
        _ => false
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