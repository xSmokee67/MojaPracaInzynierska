using API.Identity;
using DAL;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Model;
using Services.Interfaces;
using Services.Mapping;
using System.Text;

namespace API.Extensions;

// Rejestracja usług w kontenerze DI - wydzielona z Program.cs, żeby był krótki i czytelny
public static class ServiceCollectionExtensions
{
    // Konta użytkowników (ASP.NET Core Identity): polityka haseł, blokada konta, polskie komunikaty błędów
    public static IServiceCollection AddIdentityWithPolicies(this IServiceCollection services)
    {
        services.AddIdentity<User, IdentityRole<int>>(options =>
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
        services.Configure<DataProtectionTokenProviderOptions>(options =>
            options.TokenLifespan = TimeSpan.FromHours(Services.Services.PasswordResetService.TokenValidHours));

        return services;
    }

    // Uwierzytelnianie tokenem JWT w nagłówku Authorization: Bearer <token>
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, JwtSettings jwtSettings)
    {
        services.AddAuthentication(options =>
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

        return services;
    }

    // Błędy walidacji (adnotacje na DTO) zwracane w tym samym formacie { error } co reszta API
    public static IServiceCollection AddControllersWithValidationErrors(this IServiceCollection services)
    {
        services.AddControllers()
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

        return services;
    }

    // Przycisk "Authorize" w Swaggerze - token z /api/Auth/login jest dołączany do wywołań chronionych endpointów
    public static IServiceCollection AddSwaggerWithJwt(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
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

        return services;
    }

    // Serwisy warstwy logiki biznesowej (pełne nazwy klas, bo encja Model.ReservationService nazywa się tak samo jak serwis)
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Profil mapowania encji na DTO
        services.AddAutoMapper(cfg =>
        {
            cfg.AddProfile<ReservationMappingProfile>();
        });

        services.AddScoped<IReservationService, Services.Services.ReservationService>();
        services.AddScoped<IAvailabilityService, Services.Services.AvailabilityService>();
        services.AddScoped<IRoomService, Services.Services.RoomService>();
        services.AddScoped<IRoomTypeService, Services.Services.RoomTypeService>();
        services.AddScoped<IAmenityService, Services.Services.AmenityService>();
        services.AddScoped<IAdditionalServiceService, Services.Services.AdditionalServiceService>();
        services.AddScoped<IPriceListEntryService, Services.Services.PriceListEntryService>();
        services.AddScoped<IRoomBlockService, Services.Services.RoomBlockService>();
        services.AddScoped<IReviewService, Services.Services.ReviewService>();
        services.AddScoped<IAuthService, Services.Services.AuthService>();
        services.AddScoped<IProfileService, Services.Services.ProfileService>();
        services.AddScoped<IPasswordResetService, Services.Services.PasswordResetService>();
        services.AddScoped<IEmailService, Services.Services.EmailService>();
        services.AddSingleton<IFileStorageService, Services.Services.FileStorageService>();

        // Generowanie tokenów JWT (implementacja ITokenService z warstwy serwisów)
        services.AddSingleton<ITokenService, JwtTokenService>();

        return services;
    }
}