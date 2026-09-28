namespace Services.Interfaces;

public interface IAvailabilityService
{
    Task UpdateAvailabilityAsync(int roomId, DateTime startDate, DateTime endDate, string status);
}