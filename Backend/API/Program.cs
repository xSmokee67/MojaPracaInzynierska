using API.Identity;
using DAL;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Model;
using System.Text;
using Services.Interfaces;
using Services.Mapping;
// USUNIĘTO: using Services.Services; aby zapobiec konfliktom nazw

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<User, IdentityRole<int>>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders()
.AddErrorDescriber<PolishIdentityErrorDescriber>();

var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"] ?? throw new InvalidOperationException("Brak klucza JWT w konfiguracji!"));

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
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
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
builder.Services.AddSwaggerGen();

// POPRAWKA 1: Precyzyjne wskazanie profilu mapowania (rozwiązuje błąd CS1503)
builder.Services.AddAutoMapper(cfg => 
{
    cfg.AddProfile<ReservationMappingProfile>();
});

// POPRAWKA 2: Jawne użycie przestrzeni nazw dla serwisu (rozwiązuje błąd CS0104 z encją)
builder.Services.AddScoped<IReservationService, Services.Services.ReservationService>();
builder.Services.AddScoped<IAvailabilityService, Services.Services.AvailabilityService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");

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
            new RoomType { Name = "Pokój Standardowy", BasePrice = 200, MaxOccupancy = 2 },
            new RoomType { Name = "Apartament Premium", BasePrice = 500, MaxOccupancy = 4 }
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