using DAL;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;
using Services.Settings;

namespace API.Data;

// Dane startowe tworzone przy uruchomieniu API (wywołanie w Program.cs).
// Typy pokoi, pokoje, udogodnienia, usługi i zdjęcia są dodawane tylko wtedy, gdy ich jeszcze nie ma w bazie
// (porównanie po nazwie / numerze pokoju) - istniejących danych seeder nie zmienia, a nowe pozycje z tej listy
// pojawiają się także w bazie, która była utworzona wcześniej.
public static class DbSeeder
{
    private const string OwnerEmail = "admin@hotel.com";
    private const string OwnerPassword = "Admin123!";
    private const string StandardRoomTypeName = "Pokój Standardowy";
    private const string PremiumRoomTypeName = "Apartament Premium";

    // Typ pokoju w danych startowych: dane typu, prefiks plików zdjęć w Data/SeedPhotos, numery pokoi i udogodnienia tych pokoi
    private record RoomTypeSeed(string Name, decimal BasePrice, int MaxOccupancy, int Area, string Description,
        string PhotoPrefix, string[] RoomNumbers, string[] Amenities);

    private static readonly RoomTypeSeed[] RoomTypes =
    {
        new(StandardRoomTypeName, 200, 2, 22,
            "Przytulny pokój dla dwóch osób z podwójnym łóżkiem, biurkiem i łazienką z prysznicem. Idealny na krótki wypad do miasta lub podróż służbową.",
            "standard", new[] { "101", "102" },
            new[] { "WiFi", "Klimatyzacja", "Telewizor", "Łóżko małżeńskie", "Biurko", "Prysznic", "Suszarka do włosów", "Zestaw do kawy i herbaty" }),
        new(PremiumRoomTypeName, 500, 4, 48,
            "Przestronny apartament z oddzielną sypialnią i salonem z rozkładaną sofą. Łazienka z wanną, aneks kawowy i widok na okolicę. Dobry wybór dla rodzin i dłuższych pobytów.",
            "premium", new[] { "201" },
            new[] { "WiFi", "Klimatyzacja", "Telewizor", "Łóżko małżeńskie", "Rozkładana sofa", "Wanna", "Ekspres do kawy", "Minibar", "Sejf", "Szlafroki i kapcie", "Balkon" }),
        new("Pokój Jednoosobowy", 140, 1, 14,
            "Kameralny pokój dla jednej osoby z wygodnym pojedynczym łóżkiem, biurkiem do pracy i łazienką z prysznicem. Dobry wybór na podróż służbową lub krótki pobyt w mieście.",
            "single", new[] { "103", "104", "105" },
            new[] { "WiFi", "Telewizor", "Biurko", "Prysznic", "Suszarka do włosów", "Zestaw do kawy i herbaty" }),
        new("Pokój Twin", 210, 2, 20,
            "Pokój z dwoma osobnymi łóżkami – dla znajomych, współpracowników albo rodzica z dzieckiem. Kącik do pracy z biurkiem, telewizor i łazienka z wanną i prysznicem.",
            "twin", new[] { "106", "107", "108" },
            new[] { "WiFi", "Klimatyzacja", "Telewizor", "Dwa pojedyncze łóżka", "Biurko", "Wanna", "Prysznic", "Suszarka do włosów", "Zestaw do kawy i herbaty" }),
        new("Pokój Rodzinny", 360, 5, 34,
            "Duży pokój dla rodziny lub grupy do pięciu osób: trzy pojedyncze łóżka i rozkładana sofa, lodówka i przestronna łazienka. Na życzenie dostawiamy łóżeczko dla dziecka.",
            "family", new[] { "301", "302", "303", "304" },
            new[] { "WiFi", "Klimatyzacja", "Telewizor", "Rozkładana sofa", "Lodówka", "Prysznic", "Suszarka do włosów", "Zestaw do kawy i herbaty" }),
        new("Studio z Aneksem Kuchennym", 300, 3, 30,
            "Samodzielne studio na dłuższe pobyty: łóżko małżeńskie, rozkładana sofa i w pełni wyposażony aneks kuchenny z lodówką, płytą indukcyjną i ekspresem do kawy. W łazience pralka.",
            "studio", new[] { "305", "306", "307" },
            new[] { "WiFi", "Klimatyzacja", "Telewizor", "Łóżko małżeńskie", "Rozkładana sofa", "Aneks kuchenny", "Lodówka", "Ekspres do kawy", "Pralka", "Prysznic" }),
        new("Apartament z Jacuzzi", 750, 2, 55,
            "Najbardziej luksusowy apartament w hotelu: prywatne jacuzzi na tarasie z widokiem na morze, sypialnia z dużym łóżkiem małżeńskim i łazienka z wolnostojącą wanną. Szlafroki, minibar i ekspres do kawy w cenie.",
            "suite", new[] { "401", "402", "403" },
            new[] { "WiFi", "Klimatyzacja", "Telewizor", "Łóżko małżeńskie", "Jacuzzi", "Wanna", "Ekspres do kawy", "Minibar", "Sejf", "Szlafroki i kapcie", "Balkon", "Widok na morze" })
    };

    // Udogodnienia tylko w wybranych pokojach (poza udogodnieniami całego typu)
    private static readonly Dictionary<string, string[]> ExtraRoomAmenities = new()
    {
        ["101"] = new[] { "Przystosowany dla osób z niepełnosprawnościami" },
        ["105"] = new[] { "Balkon" },
        ["304"] = new[] { "Balkon", "Widok na morze" },
        ["307"] = new[] { "Balkon" }
    };

    // Usługi dodatkowe - każda ze sposobem naliczania (ServiceChargeType)
    private static readonly (string Name, decimal Price, string ChargeType)[] AdditionalServices =
    {
        ("Śniadanie", 50, ServiceChargeType.PerPersonPerNight),
        ("Parking", 30, ServiceChargeType.PerNight),
        ("Obiadokolacja", 70, ServiceChargeType.PerPersonPerNight),
        ("Wypożyczenie roweru", 35, ServiceChargeType.PerPersonPerNight),
        ("Łóżeczko dla dziecka", 25, ServiceChargeType.PerNight),
        ("Pobyt ze zwierzęciem", 40, ServiceChargeType.PerNight),
        ("Ładowanie samochodu elektrycznego", 40, ServiceChargeType.PerNight),
        ("Wstęp do strefy SPA (basen i sauna)", 45, ServiceChargeType.PerPerson),
        ("Transfer z lotniska", 120, ServiceChargeType.PerStay),
        ("Wczesne zameldowanie (od 10:00)", 60, ServiceChargeType.PerStay),
        ("Późne wymeldowanie (do 14:00)", 60, ServiceChargeType.PerStay),
        ("Pakiet powitalny (wino i owoce)", 90, ServiceChargeType.PerStay)
    };

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var fileStorage = scope.ServiceProvider.GetRequiredService<FileStorageSettings>();
        var environment = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();

        await SeedRolesAsync(roleManager);
        await SeedOwnerAsync(userManager);
        await SeedRoomTypesAsync(dbContext);
        await SeedAmenitiesAsync(dbContext);
        await SeedRoomsAsync(dbContext);
        await SeedPriceListAsync(dbContext);
        await SeedAdditionalServicesAsync(dbContext);
        await SeedRoomTypePhotosAsync(dbContext, fileStorage, environment.ContentRootPath);
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

    // 3. Typy pokoi - brakujące (po nazwie) są dodawane
    private static async Task SeedRoomTypesAsync(ApplicationDbContext dbContext)
    {
        var existing = await dbContext.RoomTypes.Select(rt => rt.Name).ToListAsync();

        foreach (var seed in RoomTypes.Where(s => !existing.Contains(s.Name)))
        {
            dbContext.RoomTypes.Add(new RoomType
            {
                Name = seed.Name,
                BasePrice = seed.BasePrice,
                MaxOccupancy = seed.MaxOccupancy,
                Area = seed.Area,
                Description = seed.Description
            });
        }
        await dbContext.SaveChangesAsync();
    }

    // 4. Udogodnienia - wszystkie używane przez pokoje z danych startowych; brakujące (po nazwie) są dodawane
    private static async Task SeedAmenitiesAsync(ApplicationDbContext dbContext)
    {
        var existing = await dbContext.Amenities.Select(a => a.Name).ToListAsync();
        var names = RoomTypes.SelectMany(s => s.Amenities)
            .Concat(ExtraRoomAmenities.Values.SelectMany(a => a))
            .Distinct();

        foreach (var name in names.Where(n => !existing.Contains(n)))
        {
            dbContext.Amenities.Add(new Amenity { Name = name });
        }
        await dbContext.SaveChangesAsync();
    }

    // 5. Fizyczne pokoje - brakujące (po numerze) są dodawane razem z udogodnieniami;
    // udogodnień pokoi, które już są w bazie, seeder nie zmienia
    private static async Task SeedRoomsAsync(ApplicationDbContext dbContext)
    {
        var existingNumbers = await dbContext.Rooms.Select(r => r.RoomNumber).ToListAsync();
        var amenities = await dbContext.Amenities.ToListAsync();

        foreach (var seed in RoomTypes)
        {
            var roomType = await dbContext.RoomTypes.FirstOrDefaultAsync(rt => rt.Name == seed.Name);
            if (roomType == null)
            {
                continue;
            }

            foreach (var number in seed.RoomNumbers.Where(n => !existingNumbers.Contains(n)))
            {
                var amenityNames = seed.Amenities
                    .Concat(ExtraRoomAmenities.TryGetValue(number, out var extra) ? extra : Array.Empty<string>())
                    .ToHashSet();

                var room = new Room { RoomTypeId = roomType.RoomTypeId, RoomNumber = number, Status = RoomStatus.Available };
                foreach (var amenity in amenities.Where(a => amenityNames.Contains(a.Name)))
                {
                    room.Amenities.Add(amenity);
                }
                dbContext.Rooms.Add(room);
            }
        }
        await dbContext.SaveChangesAsync();
    }

    // 6. Cennik sezonowy (np. drożej w te wakacje)
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

    // 7. Usługi dodatkowe - brakujące (po nazwie) są dodawane
    private static async Task SeedAdditionalServicesAsync(ApplicationDbContext dbContext)
    {
        var existing = await dbContext.AdditionalServices.Select(s => s.Name).ToListAsync();

        foreach (var (name, price, chargeType) in AdditionalServices.Where(s => !existing.Contains(s.Name)))
        {
            dbContext.AdditionalServices.Add(new AdditionalService { Name = name, Price = price, ChargeType = chargeType });
        }
        await dbContext.SaveChangesAsync();
    }

    // 8. Przykładowe zdjęcia typów pokoi - pliki z katalogu Data/SeedPhotos (np. standard-1.jpg, suite-1.jpg)
    // są kopiowane do uploads/room-types i przypinane do typu pokoju, który nie ma jeszcze żadnego zdjęcia.
    // Dzięki temu na świeżej bazie (inny komputer, nowa instalacja) pokoje od razu mają zdjęcia.
    // Pierwsze zdjęcie (SortOrder = 0) jest zdjęciem głównym.
    private static async Task SeedRoomTypePhotosAsync(ApplicationDbContext dbContext, FileStorageSettings fileStorage, string contentRootPath)
    {
        var seedPhotosPath = Path.Combine(contentRootPath, "Data", "SeedPhotos");
        if (!Directory.Exists(seedPhotosPath))
        {
            return;
        }

        const string folder = "room-types"; // ten sam katalog co zdjęcia wgrywane w panelu (RoomTypeService)
        var targetDirectory = Path.Combine(fileStorage.RootPath, folder);
        Directory.CreateDirectory(targetDirectory);

        foreach (var seed in RoomTypes)
        {
            var roomType = await dbContext.RoomTypes
                .Include(rt => rt.Photos)
                .FirstOrDefaultAsync(rt => rt.Name == seed.Name);
            if (roomType == null || roomType.Photos.Count > 0)
            {
                continue;
            }

            var files = Directory.GetFiles(seedPhotosPath, $"{seed.PhotoPrefix}-*.jpg")
                .OrderBy(f => f, StringComparer.Ordinal)
                .ToList();

            for (var i = 0; i < files.Count; i++)
            {
                var fileName = Path.GetFileName(files[i]);
                var target = Path.Combine(targetDirectory, fileName);
                if (!File.Exists(target))
                {
                    File.Copy(files[i], target);
                }

                dbContext.RoomTypePhotos.Add(new RoomTypePhoto
                {
                    RoomTypeId = roomType.RoomTypeId,
                    PhotoUrl = $"{fileStorage.RequestPath}/{folder}/{fileName}",
                    SortOrder = i
                });
            }
        }

        await dbContext.SaveChangesAsync();
    }
}