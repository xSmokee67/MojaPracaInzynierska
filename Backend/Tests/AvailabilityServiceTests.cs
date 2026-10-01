using Microsoft.EntityFrameworkCore;

namespace Tests;

// Testy aktualizacji kalendarza dostępności - AvailabilityService.UpdateAvailabilityAsync
public class AvailabilityServiceTests
{
    [Fact(DisplayName = "Kalendarz: tworzony jest wpis dla każdej nocy z zakresu (bez dnia końcowego)")]
    public async Task CreatesEntryForEachNight()
    {
        using var context = TestData.CreateContext();
        var service = new Services.Services.AvailabilityService(context);

        await service.UpdateAvailabilityAsync(TestData.Room101Id, new DateTime(2027, 3, 10), new DateTime(2027, 3, 14), "blocked");

        var dates = await context.Availabilities.OrderBy(a => a.Date).Select(a => a.Date).ToListAsync();
        Assert.Equal(new List<DateTime>
        {
            new DateTime(2027, 3, 10), new DateTime(2027, 3, 11), new DateTime(2027, 3, 12), new DateTime(2027, 3, 13)
        }, dates);
    }

    [Fact(DisplayName = "Kalendarz: ponowna aktualizacja zmienia status istniejących wpisów zamiast je dublować")]
    public async Task UpdatesExistingEntries()
    {
        using var context = TestData.CreateContext();
        var service = new Services.Services.AvailabilityService(context);

        await service.UpdateAvailabilityAsync(TestData.Room101Id, new DateTime(2027, 3, 10), new DateTime(2027, 3, 13), "booked");
        await service.UpdateAvailabilityAsync(TestData.Room101Id, new DateTime(2027, 3, 10), new DateTime(2027, 3, 13), "free");

        var entries = await context.Availabilities.ToListAsync();
        Assert.Equal(3, entries.Count);
        Assert.All(entries, a => Assert.Equal("free", a.Status));
    }

    [Fact(DisplayName = "Kalendarz: częściowo nakładający się zakres aktualizuje tylko wspólne dni i dopisuje nowe")]
    public async Task HandlesPartiallyOverlappingRange()
    {
        using var context = TestData.CreateContext();
        var service = new Services.Services.AvailabilityService(context);

        await service.UpdateAvailabilityAsync(TestData.Room101Id, new DateTime(2027, 3, 10), new DateTime(2027, 3, 13), "booked");
        await service.UpdateAvailabilityAsync(TestData.Room101Id, new DateTime(2027, 3, 12), new DateTime(2027, 3, 15), "blocked");

        var entries = await context.Availabilities.OrderBy(a => a.Date).ToListAsync();
        Assert.Equal(5, entries.Count); // 10-14 marca
        Assert.Equal(new List<string> { "booked", "booked", "blocked", "blocked", "blocked" }, entries.Select(a => a.Status).ToList());
    }

    [Fact(DisplayName = "Kalendarz: wpisy innego pokoju nie są zmieniane")]
    public async Task DoesNotTouchOtherRooms()
    {
        using var context = TestData.CreateContext();
        var service = new Services.Services.AvailabilityService(context);

        await service.UpdateAvailabilityAsync(TestData.Room101Id, new DateTime(2027, 3, 10), new DateTime(2027, 3, 12), "booked");
        await service.UpdateAvailabilityAsync(TestData.Room102Id, new DateTime(2027, 3, 10), new DateTime(2027, 3, 12), "blocked");

        Assert.All(await context.Availabilities.Where(a => a.RoomId == TestData.Room101Id).ToListAsync(), a => Assert.Equal("booked", a.Status));
        Assert.All(await context.Availabilities.Where(a => a.RoomId == TestData.Room102Id).ToListAsync(), a => Assert.Equal("blocked", a.Status));
    }
}