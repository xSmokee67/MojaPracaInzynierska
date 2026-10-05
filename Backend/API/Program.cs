using API.Data;
using API.Extensions;
using API.Identity;
using DAL;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Services.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Konta, role, polityka haseł i blokada konta (szczegóły w Extensions/ServiceCollectionExtensions.cs)
builder.Services.AddIdentityWithPolicies();

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
builder.Services.AddJwtAuthentication(jwtSettings);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(frontendSettings.BaseUrl.TrimEnd('/'))
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

builder.Services.AddControllersWithValidationErrors();
builder.Services.AddSwaggerWithJwt();

// Zdjęcia pokoi zapisywane w katalogu "uploads" obok projektu API i udostępniane pod adresem /uploads
var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
builder.Services.AddSingleton(new FileStorageSettings { RootPath = uploadsPath, RequestPath = "/uploads" });

// Serwisy warstwy logiki biznesowej, AutoMapper i generowanie tokenów JWT
builder.Services.AddApplicationServices();

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

// Role, konto Właściciela i przykładowe pokoje (tylko gdy ich jeszcze nie ma w bazie) - Data/DbSeeder.cs
await DbSeeder.SeedAsync(app.Services);

app.Run();