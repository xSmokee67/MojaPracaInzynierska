using API.Identity;
using DAL;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Model;
using System.Text;
using Services.Interfaces;
using Services.Mapping;
using Services.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<User, IdentityRole<int>>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    // Polityka haseł zgodna z podpowiedziami w formularzach: min. 8 znaków, w tym cyfra (wielkość liter dowolna)
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
    options.User.RequireUniqueEmail = true;

    // Blokada konta na 15 minut po 5 nieudanych próbach logowania (ochrona przed zgadywaniem hasła)
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders()
.AddErrorDescriber<PolishIdentityErrorDescriber>();

// Link do resetu hasła (token Identity) jest ważny 2 godziny
builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
    options.TokenLifespan = TimeSpan.FromHours(Services.Services.PasswordResetService.TokenValidHours));

// Adres aplikacji React (linki w e-mailach, CORS) i wysyłka e-maili - sekcje "Frontend" i "Email" w appsettings.json
var frontendSettings = builder.Configuration.GetSection("Frontend").Get<FrontendSettings>() ?? new FrontendSettings();
builder.Services.AddSingleton(frontendSettings);

// Bez serwera SMTP e-maile są zapisywane jako pliki .eml w katalogu Backend/API/Emails
var emailSettings = builder.Configuration.GetSection("Email").Get<EmailSettings>() ?? new EmailSettings();
emailSettings.PickupDirectory = Path.Combine(builder.Environment.ContentRootPath, emailSettings.PickupDirectory);
builder.Services.AddSingleton(emailSettings);

// Klucz podpisu tokenów nie jest trzymany w repozytorium - ustawia się go w User Secrets (instrukcja w README.md)
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
if (string.IsNullOrWhiteSpace(jwtSettings.Key) || jwtSettings.Key.Length < 32)
    throw new InvalidOperationException("Brak klucza JWT (min. 32 znaki). Ustaw go w katalogu Backend/API poleceniem: dotnet user-secrets set \"Jwt:Key\" \"<losowy ciąg min. 32 znaków>\"");
builder.Services.AddSingleton(jwtSettings);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key))
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(frontendSettings.BaseUrl.TrimEnd('/'))
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

// Błędy walidacji (adnotacje na DTO) zwracane w tym samym formacie { error } co reszta API
builder.Services.AddControllers()
.ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        // Błąd parsowania JSON (np. tekst zamiast liczby) - klucze zaczynają się od "$"
        if (context.ModelState.Keys.Any(k => k.StartsWith("$")))
            return new BadRequestObjectResult(new { error = "Nieprawidłowy format danych w formularzu." });

        var errors = context.ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Nieprawidłowe dane w formularzu." : e.ErrorMessage)
            .Distinct();

        return new BadRequestObjectResult(new { error = string.Join(" ", errors) });
    };
});
builder.Services.AddEndpointsApiExplorer();

// Przycisk "Authorize" w Swaggerze - token z /api/Auth/login jest dołączany do wywołań chronionych endpointów
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Wklej token zwrócony przez POST /api/Auth/login (bez słowa \"Bearer\")."
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = []
    });
});

// Profil mapowania encji na DTO
builder.Services.AddAutoMapper(cfg =>
{
    cfg.AddProfile<ReservationMappingProfile>();
});

// Serwisy warstwy logiki biznesowej (pełne nazwy klas, bo encja Model.ReservationService nazywa się tak samo jak serwis)
builder.Services.AddScoped<IReservationService, Services.Services.ReservationService>();
builder.Services.AddScoped<IAvailabilityService, Services.Services.AvailabilityService>();
builder.Services.AddScoped<IRoomService, Services.Services.RoomService>();
builder.Services.AddScoped<IRoomTypeService, Services.Services.RoomTypeService>();
builder.Services.AddScoped<IAmenityService, Services.Services.AmenityService>();
builder.Services.AddScoped<IAdditionalServiceService, Services.Services.AdditionalServiceService>();
builder.Services.AddScoped<IPriceListEntryService, Services.Services.PriceListEntryService>();
builder.Services.AddScoped<IRoomBlockService, Services.Services.RoomBlockService>();
builder.Services.AddScoped<IReviewService, Services.Services.ReviewService>();
builder.Services.AddScoped<IAuthService, Services.Services.AuthService>();
builder.Services.AddScoped<IProfileService, Services.Services.ProfileService>();
builder.Services.AddScoped<IPasswordResetService, Services.Services.PasswordResetService>();
builder.Services.AddScoped<IEmailService, Services.Services.EmailService>();

// Zdjęcia pokoi zapisywane w katalogu "uploads" obok projektu API i udostępniane pod adresem /uploads
var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
builder.Services.AddSingleton(new FileStorageSettings { RootPath = uploadsPath, RequestPath = "/uploads" });
builder.Services.AddSingleton<IFileStorageService, Services.Services.FileStorageService>();

// Generowanie tokenów JWT (implementacja ITokenService z warstwy serwisów)
builder.Services.AddSingleton<ITokenService, JwtTokenService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    // 1. Tworzenie domyślnych ról
    string[] roleNames = { "Owner", "Guest" };
    foreach (var roleName in roleNames)
    {
        if (!await roleManager.RoleExistsAsync(roleName))
            await roleManager.CreateAsync(new IdentityRole<int>(roleName));
    }

    // 2. Tworzenie domyślnego konta Właściciela
    var ownerEmail = "admin@hotel.com";
    if (await userManager.FindByEmailAsync(ownerEmail) == null)
    {
        var newOwner = new Owner
        {
            UserName = ownerEmail, Email = ownerEmail,
            FirstName = "Jan", LastName = "Kowalski",
            AccountType = "owner", RegistrationDate = DateTime.UtcNow
        };
        var result = await userManager.CreateAsync(newOwner, "Admin123!");
        if (result.Succeeded) await userManager.AddToRoleAsync(newOwner, "Owner");
    }

    // 3. SEED DATA - Typy pokoi
    if (!dbContext.RoomTypes.Any())
    {
        dbContext.RoomTypes.AddRange(
            new RoomType
            {
                Name = "Pokój Standardowy", BasePrice = 200, MaxOccupancy = 2,
                Description = "Przytulny pokój dla dwóch osób z podwójnym łóżkiem, biurkiem i łazienką z prysznicem. Idealny na krótki wypad do miasta lub podróż służbową."
            },
            new RoomType
            {
                Name = "Apartament Premium", BasePrice = 500, MaxOccupancy = 4,
                Description = "Przestronny apartament z oddzielną sypialnią i salonem z rozkładaną sofą. Łazienka z wanną, aneks kawowy i widok na okolicę. Dobry wybór dla rodzin i dłuższych pobytów."
            }
        );
        dbContext.SaveChanges();
    }

    // 4. SEED DATA - Fizyczne pokoje
    if (!dbContext.Rooms.Any())
    {
        var standard = dbContext.RoomTypes.First(rt => rt.Name == "Pokój Standardowy");
        var premium = dbContext.RoomTypes.First(rt => rt.Name == "Apartament Premium");

        dbContext.Rooms.AddRange(
            new Room { RoomTypeId = standard.RoomTypeId, RoomNumber = "101", Status = "available" },
            new Room { RoomTypeId = standard.RoomTypeId, RoomNumber = "102", Status = "available" },
            new Room { RoomTypeId = premium.RoomTypeId, RoomNumber = "201", Status = "available" }
        );
        dbContext.SaveChanges();
    }

    // 5. SEED DATA - Cennik sezonowy (np. drożej w te wakacje)
    if (!dbContext.PriceListEntries.Any())
    {
        var standard = dbContext.RoomTypes.First(rt => rt.Name == "Pokój Standardowy");
        dbContext.PriceListEntries.Add(new PriceListEntry
        {
            RoomTypeId = standard.RoomTypeId,
            StartDate = new DateTime(2027, 6, 1),
            EndDate = new DateTime(2027, 8, 31),
            PricePerNight = 350 // W wakacje cena rośnie z 200 na 350 zł
        });
        dbContext.SaveChanges();
    }
    
    // 6. SEED DATA - Usługi dodatkowe
    if (!dbContext.AdditionalServices.Any())
    {
        dbContext.AdditionalServices.AddRange(
            new AdditionalService { Name = "Śniadanie", Price = 50 },
            new AdditionalService { Name = "Parking", Price = 30 }
        );
        dbContext.SaveChanges();
    }

    // 7. SEED DATA - Udogodnienia
    if (!dbContext.Amenities.Any())
    {
        dbContext.Amenities.AddRange(
            new Amenity { Name = "WiFi" },
            new Amenity { Name = "Klimatyzacja" },
            new Amenity { Name = "Telewizor" },
            new Amenity { Name = "Widok na morze" }
        );
        dbContext.SaveChanges();
    }
}

app.Run();