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
        var content = new byte[] { 1, 2, 3, 4 };

        var url = await _service.SaveImageAsync(new MemoryStream(content), "Mój Pokój.JPG", "room-types");

        Assert.StartsWith("/uploads/room-types/", url);
        Assert.EndsWith(".jpg", url);
        Assert.DoesNotContain("Mój", url);  // oryginalna nazwa nie trafia na dysk
        var path = Path.Combine(_root, "room-types", Path.GetFileName(url));
        Assert.Equal(content, await File.ReadAllBytesAsync(path));
    }

    [Fact(DisplayName = "Zdjęcia: dwa pliki o tej samej nazwie nie nadpisują się")]
    public async Task SaveImage_GeneratesUniqueNames()
    {
        var first = await _service.SaveImageAsync(new MemoryStream(new byte[] { 1 }), "pokoj.png", "room-types");
        var second = await _service.SaveImageAsync(new MemoryStream(new byte[] { 2 }), "pokoj.png", "room-types");

        Assert.NotEqual(first, second);
        Assert.Equal(2, Directory.GetFiles(Path.Combine(_root, "room-types")).Length);
    }

    [Fact(DisplayName = "Zdjęcia: usunięcie kasuje plik z dysku")]
    public async Task Delete_RemovesFile()
    {
        var url = await _service.SaveImageAsync(new MemoryStream(new byte[] { 1 }), "pokoj.png", "room-types");

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