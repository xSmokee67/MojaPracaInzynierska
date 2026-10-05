using DAL;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;

namespace API.Data;

// Dane startowe tworzone przy uruchomieniu API (wywołanie w Program.cs) - każdy krok wykonuje się tylko wtedy, gdy danych jeszcze nie ma w bazie
public static class DbSeeder
{
    private const string OwnerEmail = "admin@hotel.com";
    private const string OwnerPassword = "Admin123!";
    private const string StandardRoomTypeName = "Pokój Standardowy";
    private const string PremiumRoomTypeName = "Apartament Premium";

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        await SeedRolesAsync(roleManager);
        await SeedOwnerAsync(userManager);
        await SeedRoomTypesAsync(dbContext);
        await SeedRoomsAsync(dbContext);
        await SeedPriceListAsync(dbContext);
        await SeedAdditionalServicesAsync(dbContext);
        await SeedAmenitiesAsync(dbContext);
    }

    // 1. Domyślne role
    private static async Task SeedRolesAsync(RoleManager<IdentityRole<int>> roleManager)
    {
        foreach (var roleName in UserRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole<int>(roleName));
            }
        }
    }

    // 2. Domyślne konto Właściciela
    private static async Task SeedOwnerAsync(UserManager<User> userManager)
    {
        if (await userManager.FindByEmailAsync(OwnerEmail) != null)
        {
            return;
        }

        var owner = new Owner
        {
            UserName = OwnerEmail,
            Email = OwnerEmail,
            FirstName = "Jan",
            LastName = "Kowalski",
            AccountType = AccountTypes.Owner,
            RegistrationDate = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(owner, OwnerPassword);
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(owner, UserRoles.Owner);
        }
    }

    // 3. Typy pokoi
    private static async Task SeedRoomTypesAsync(ApplicationDbContext dbContext)
    {
        if (await dbContext.RoomTypes.AnyAsync())
        {
            return;
        }

        dbContext.RoomTypes.AddRange(
            new RoomType
            {
                Name = StandardRoomTypeName,
                BasePrice = 200,
                MaxOccupancy = 2,
                Description = "Przytulny pokój dla dwóch osób z podwójnym łóżkiem, biurkiem i łazienką z prysznicem. Idealny na krótki wypad do miasta lub podróż służbową."
            },
            new RoomType
            {
                Name = PremiumRoomTypeName,
                BasePrice = 500,
                MaxOccupancy = 4,
                Description = "Przestronny apartament z oddzielną sypialnią i salonem z rozkładaną sofą. Łazienka z wanną, aneks kawowy i widok na okolicę. Dobry wybór dla rodzin i dłuższych pobytów."
            }
        );
        await dbContext.SaveChangesAsync();
    }

    // 4. Fizyczne pokoje
    private static async Task SeedRoomsAsync(ApplicationDbContext dbContext)
    {
        if (await dbContext.Rooms.AnyAsync())
        {
            return;
        }

        var standard = await dbContext.RoomTypes.FirstAsync(rt => rt.Name == StandardRoomTypeName);
        var premium = await dbContext.RoomTypes.FirstAsync(rt => rt.Name == PremiumRoomTypeName);

        dbContext.Rooms.AddRange(
            new Room { RoomTypeId = standard.RoomTypeId, RoomNumber = "101", Status = RoomStatus.Available },
            new Room { RoomTypeId = standard.RoomTypeId, RoomNumber = "102", Status = RoomStatus.Available },
            new Room { RoomTypeId = premium.RoomTypeId, RoomNumber = "201", Status = RoomStatus.Available }
        );
        await dbContext.SaveChangesAsync();
    }

    // 5. Cennik sezonowy (np. drożej w te wakacje)
    private static async Task SeedPriceListAsync(ApplicationDbContext dbContext)
    {
        if (await dbContext.PriceListEntries.AnyAsync())
        {
            return;
        }

        var standard = await dbContext.RoomTypes.FirstAsync(rt => rt.Name == StandardRoomTypeName);
        dbContext.PriceListEntries.Add(new PriceListEntry
        {
            RoomTypeId = standard.RoomTypeId,
            StartDate = new DateTime(2027, 6, 1),
            EndDate = new DateTime(2027, 8, 31),
            PricePerNight = 350 // W wakacje cena rośnie z 200 na 350 zł
        });
        await dbContext.SaveChangesAsync();
    }

    // 6. Usługi dodatkowe
    private static async Task SeedAdditionalServicesAsync(ApplicationDbContext dbContext)
    {
        if (await dbContext.AdditionalServices.AnyAsync())
        {
            return;
        }

        dbContext.AdditionalServices.AddRange(
            new AdditionalService { Name = "Śniadanie", Price = 50 },
            new AdditionalService { Name = "Parking", Price = 30 }
        );
        await dbContext.SaveChangesAsync();
    }

    // 7. Udogodnienia
    private static async Task SeedAmenitiesAsync(ApplicationDbContext dbContext)
    {
        if (await dbContext.Amenities.AnyAsync())
        {
            return;
        }

        dbContext.Amenities.AddRange(
            new Amenity { Name = "WiFi" },
            new Amenity { Name = "Klimatyzacja" },
            new Amenity { Name = "Telewizor" },
            new Amenity { Name = "Widok na morze" }
        );
        await dbContext.SaveChangesAsync();
    }
}