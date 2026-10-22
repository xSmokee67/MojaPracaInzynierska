namespace Services.Interfaces;

public interface IFileStorageService
{
    void ValidateImage(string fileName, long length);
    Task<string> SaveImageAsync(Stream content, string fileName, string folder);
    void Delete(string fileUrl);
}