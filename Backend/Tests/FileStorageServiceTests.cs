using Services.Settings;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

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

    // Prawdziwy obraz w pamięci (serwis odczytuje zawartość pliku, więc przypadkowe bajty nie przejdą)
    private static MemoryStream TestImage(int width = 40, int height = 20, bool png = false)
    {
        using var image = new Image<Rgba32>(width, height);
        var stream = new MemoryStream();
        if (png) image.SaveAsPng(stream); else image.SaveAsJpeg(stream);
        stream.Position = 0;
        return stream;
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
        var url = await _service.SaveImageAsync(TestImage(), "Mój Pokój.JPG", "room-types");

        Assert.StartsWith("/uploads/room-types/", url);
        Assert.EndsWith(".jpg", url);
        Assert.DoesNotContain("Mój", url);  // oryginalna nazwa nie trafia na dysk
        var path = Path.Combine(_root, "room-types", Path.GetFileName(url));
        using var saved = await Image.LoadAsync(path); // zapisany plik jest poprawnym obrazem
        Assert.Equal(40, saved.Width);
        Assert.Equal(20, saved.Height);
    }

    [Fact(DisplayName = "Zdjęcia: plik z rozszerzeniem obrazu, ale inną zawartością jest odrzucany i nie trafia na dysk")]
    public async Task SaveImage_Throws_ForNonImageContent()
    {
        var notAnImage = new MemoryStream(new byte[] { 0x4D, 0x5A, 1, 2, 3, 4, 5, 6 }); // np. program .exe przemianowany na .jpg

        await Assert.ThrowsAsync<ArgumentException>(() => _service.SaveImageAsync(notAnImage, "pokoj.jpg", "room-types"));

        var directory = Path.Combine(_root, "room-types");
        Assert.True(!Directory.Exists(directory) || Directory.GetFiles(directory).Length == 0);
    }

    [Fact(DisplayName = "Zdjęcia: duże zdjęcie jest zmniejszane do 1600 px na dłuższym boku z zachowaniem proporcji")]
    public async Task SaveImage_ResizesLargeImage()
    {
        var url = await _service.SaveImageAsync(TestImage(3200, 1000), "panorama.jpg", "room-types");

        using var saved = await Image.LoadAsync(Path.Combine(_root, "room-types", Path.GetFileName(url)));
        Assert.Equal(1600, saved.Width);
        Assert.Equal(500, saved.Height);
    }

    [Fact(DisplayName = "Zdjęcia: dwa pliki o tej samej nazwie nie nadpisują się")]
    public async Task SaveImage_GeneratesUniqueNames()
    {
        var first = await _service.SaveImageAsync(TestImage(png: true), "pokoj.png", "room-types");
        var second = await _service.SaveImageAsync(TestImage(png: true), "pokoj.png", "room-types");

        Assert.NotEqual(first, second);
        Assert.Equal(2, Directory.GetFiles(Path.Combine(_root, "room-types")).Length);
    }

    [Fact(DisplayName = "Zdjęcia: usunięcie kasuje plik z dysku")]
    public async Task Delete_RemovesFile()
    {
        var url = await _service.SaveImageAsync(TestImage(png: true), "pokoj.png", "room-types");

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