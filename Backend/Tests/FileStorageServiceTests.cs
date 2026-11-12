using Services.Settings;

namespace Tests;

// Testy zapisu zdjęć pokoi na dysku - FileStorageService (każdy test na osobnym katalogu tymczasowym)
public class FileStorageServiceTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "hotel-uploads-" + Guid.NewGuid());
    private readonly Services.Services.FileStorageService _service;

    public FileStorageServiceTests()
    {
        Directory.CreateDirectory(_root);
        _service = new Services.Services.FileStorageService(new FileStorageSettings { RootPath = _root, RequestPath = "/uploads", MaxFileSizeBytes = 1024 });
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }

    // Zawartość z poprawną sygnaturą formatu (serwis sprawdza pierwsze bajty pliku, więc przypadkowe bajty nie przejdą)
    private static readonly byte[] JpegContent = { 0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4 };
    private static readonly byte[] PngContent = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 5, 6 };
    private static readonly byte[] WebpContent = { (byte)'R', (byte)'I', (byte)'F', (byte)'F', 0, 0, 0, 0, (byte)'W', (byte)'E', (byte)'B', (byte)'P', 7 };

    [Theory(DisplayName = "Zdjęcia: akceptowane są pliki JPG, PNG i WEBP (wielkość liter bez znaczenia)")]
    [InlineData("pokoj.jpg")]
    [InlineData("pokoj.JPEG")]
    [InlineData("pokoj.png")]
    [InlineData("pokoj.webp")]
    public void ValidateImage_AcceptsSupportedFormats(string fileName)
    {
        var exception = Record.Exception(() => _service.ValidateImage(fileName, 500));

        Assert.Null(exception);
    }

    [Theory(DisplayName = "Zdjęcia: inne formaty są odrzucane")]
    [InlineData("pokoj.gif")]
    [InlineData("skrypt.exe")]
    [InlineData("cennik.pdf")]
    [InlineData("bez-rozszerzenia")]
    public void ValidateImage_RejectsUnsupportedFormats(string fileName)
    {
        Assert.Throws<ArgumentException>(() => _service.ValidateImage(fileName, 500));
    }

    [Theory(DisplayName = "Zdjęcia: plik pusty lub większy niż limit jest odrzucany")]
    [InlineData(0)]
    [InlineData(1025)]
    public void ValidateImage_RejectsInvalidSize(int length)
    {
        Assert.Throws<ArgumentException>(() => _service.ValidateImage("pokoj.jpg", length));
    }

    [Fact(DisplayName = "Zdjęcia: zapis tworzy plik o losowej nazwie i zwraca jego adres")]
    public async Task SaveImage_WritesFileAndReturnsUrl()
    {
        var url = await _service.SaveImageAsync(new MemoryStream(JpegContent), "Mój Pokój.JPG", "room-types");

        Assert.StartsWith("/uploads/room-types/", url);
        Assert.EndsWith(".jpg", url);
        Assert.DoesNotContain("Mój", url);  // oryginalna nazwa nie trafia na dysk
        var path = Path.Combine(_root, "room-types", Path.GetFileName(url));
        Assert.Equal(JpegContent, await File.ReadAllBytesAsync(path));
    }

    [Fact(DisplayName = "Zdjęcia: plik z rozszerzeniem obrazu, ale inną zawartością jest odrzucany i nie trafia na dysk")]
    public async Task SaveImage_Throws_ForNonImageContent()
    {
        var notAnImage = new MemoryStream(new byte[] { 0x4D, 0x5A, 1, 2, 3, 4, 5, 6 }); // np. program .exe przemianowany na .jpg

        await Assert.ThrowsAsync<ArgumentException>(() => _service.SaveImageAsync(notAnImage, "pokoj.jpg", "room-types"));

        var directory = Path.Combine(_root, "room-types");
        Assert.True(!Directory.Exists(directory) || Directory.GetFiles(directory).Length == 0);
    }

    [Fact(DisplayName = "Zdjęcia: zawartość musi odpowiadać rozszerzeniu (PNG zapisany jako .jpg jest odrzucany, WEBP przyjmowany)")]
    public async Task SaveImage_ChecksSignatureAgainstExtension()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _service.SaveImageAsync(new MemoryStream(PngContent), "pokoj.jpg", "room-types"));

        var url = await _service.SaveImageAsync(new MemoryStream(WebpContent), "pokoj.webp", "room-types");
        Assert.EndsWith(".webp", url);
    }

    [Fact(DisplayName = "Zdjęcia: dwa pliki o tej samej nazwie nie nadpisują się")]
    public async Task SaveImage_GeneratesUniqueNames()
    {
        var first = await _service.SaveImageAsync(new MemoryStream(PngContent), "pokoj.png", "room-types");
        var second = await _service.SaveImageAsync(new MemoryStream(PngContent), "pokoj.png", "room-types");

        Assert.NotEqual(first, second);
        Assert.Equal(2, Directory.GetFiles(Path.Combine(_root, "room-types")).Length);
    }

    [Fact(DisplayName = "Zdjęcia: usunięcie kasuje plik z dysku")]
    public async Task Delete_RemovesFile()
    {
        var url = await _service.SaveImageAsync(new MemoryStream(PngContent), "pokoj.png", "room-types");

        _service.Delete(url);

        Assert.Empty(Directory.GetFiles(Path.Combine(_root, "room-types")));
    }

    [Theory(DisplayName = "Zdjęcia: adres spoza katalogu z uploadami nie usuwa żadnego pliku")]
    [InlineData("/uploads/../tajne.txt")]
    [InlineData("/uploads/room-types/../../tajne.txt")]
    [InlineData("/inny-katalog/tajne.txt")]
    public void Delete_IgnoresPathsOutsideUploads(string url)
    {
        var secretFile = Path.Combine(Path.GetDirectoryName(_root)!, "tajne.txt");
        var existedBefore = File.Exists(secretFile);
        if (!existedBefore) File.WriteAllText(secretFile, "nie usuwać");

        try
        {
            _service.Delete(url);
            Assert.True(File.Exists(secretFile));
        }
        finally
        {
            if (!existedBefore && File.Exists(secretFile)) File.Delete(secretFile);
        }
    }
}