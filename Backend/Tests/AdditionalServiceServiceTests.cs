using Microsoft.EntityFrameworkCore;
using Services.DTO;

namespace Tests;

// Testy usług dodatkowych w panelu właściciela - AdditionalServiceService (sposób naliczania)
public class AdditionalServiceServiceTests
{
    [Fact(DisplayName = "Usługi: nowa usługa zapisuje sposób naliczania")]
    public async Task Create_SavesChargeType()
    {
        using var context = TestData.CreateContext();
        var service = new Services.Services.AdditionalServiceService(context);

        await service.CreateAdditionalServiceAsync(new AdditionalServiceDto { Name = "Transfer z lotniska", Price = 120, ChargeType = "per-stay" });

        var saved = await context.AdditionalServices.SingleAsync(s => s.Name == "Transfer z lotniska");
        Assert.Equal("per-stay", saved.ChargeType);
    }

    [Fact(DisplayName = "Usługi: nieznany sposób naliczania jest odrzucany")]
    public async Task Create_Throws_ForUnknownChargeType()
    {
        using var context = TestData.CreateContext();
        var service = new Services.Services.AdditionalServiceService(context);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAdditionalServiceAsync(new AdditionalServiceDto { Name = "Sprzątanie", Price = 40, ChargeType = "per-week" }));

        Assert.Equal(2, await context.AdditionalServices.CountAsync());
    }
}
