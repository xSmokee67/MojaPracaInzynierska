namespace Services.Settings;

// Zapis plików wgrywanych przez użytkowników (zdjęcia pokoi)
public class FileStorageSettings
{
    // Fizyczny katalog na dysku serwera (ustawiany w Program.cs)
    public string RootPath {get; set; } = string.Empty;

    // Adres, pod którym API udostępnia pliki z RootPath
    public string RequestPath {get; set; } = "/uploads";

    public long MaxFileSizeBytes {get; set; } = 5 * 1024 * 1024;
}