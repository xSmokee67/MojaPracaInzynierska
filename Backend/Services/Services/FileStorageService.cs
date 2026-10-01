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

    // Zwraca adres pliku, np. /uploads/room-types/3f2a...c1.jpg
    public async Task<string> SaveImageAsync(Stream content, string fileName, string folder)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var storedName = $"{Guid.NewGuid():N}{extension}";

        var directory = Path.Combine(_settings.RootPath, folder);
        Directory.CreateDirectory(directory);

        await using (var file = File.Create(Path.Combine(directory, storedName)))
        {
            await content.CopyToAsync(file);
        }

        return $"{_settings.RequestPath}/{folder}/{storedName}";
    }

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