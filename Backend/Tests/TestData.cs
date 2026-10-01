using AutoMapper;
using DAL;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Model;
using Services.Mapping;

namespace Tests;

// Wspólne przygotowanie danych dla testów - każdy test dostaje osobną bazę w pamięci (EF Core InMemory)
public static class TestData
{
    // Dane jak w seedzie z Program.cs: 2 typy pokoi, 3 pokoje, cennik wakacyjny dla pokoju standardowego, 2 usługi
    public const int StandardRoomTypeId = 1;
    public const int PremiumRoomTypeId = 2;
    public const int Room101Id = 1;
    public const int Room102Id = 2;
    public const int Room201Id = 3;
    public const int BreakfastId = 1;
    public const int ParkingId = 2;
    public const int GuestId = 10;

    public static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var context = new ApplicationDbContext(options);

        context.RoomTypes.AddRange(
            new RoomType { RoomTypeId = StandardRoomTypeId, Name = "Pokój Standardowy", BasePrice = 200, MaxOccupancy = 2 },
            new RoomType { RoomTypeId = PremiumRoomTypeId, Name = "Apartament Premium", BasePrice = 500, MaxOccupancy = 4 }
        );

        context.Rooms.AddRange(
            new Room { RoomId = Room101Id, RoomTypeId = StandardRoomTypeId, RoomNumber = "101", Status = "available" },
            new Room { RoomId = Room102Id, RoomTypeId = StandardRoomTypeId, RoomNumber = "102", Status = "available" },
            new Room { RoomId = Room201Id, RoomTypeId = PremiumRoomTypeId, RoomNumber = "201", Status = "available" }
        );

        // Sezon wakacyjny: 1-31 lipca 2027 (obie daty włącznie), 350 zł zamiast 200 zł
        context.PriceListEntries.Add(new PriceListEntry
        {
            PriceListEntryId = 1,
            RoomTypeId = StandardRoomTypeId,
            StartDate = new DateTime(2027, 7, 1),
            EndDate = new DateTime(2027, 7, 31),
            PricePerNight = 350
        });

        context.AdditionalServices.AddRange(
            new AdditionalService { ServiceId = BreakfastId, Name = "Śniadanie", Price = 50 },
            new AdditionalService { ServiceId = ParkingId, Name = "Parking", Price = 30 }
        );

        context.SaveChanges();
        return context;
    }

    // Mapper skonfigurowany tak samo jak w Program.cs
    public static IMapper CreateMapper()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAutoMapper(cfg =>
        {
            cfg.AddProfile<ReservationMappingProfile>();
        });

        return services.BuildServiceProvider().GetRequiredService<IMapper>();
    }

    public static Services.Services.ReservationService CreateReservationService(ApplicationDbContext context)
    {
        return new Services.Services.ReservationService(context, CreateMapper(), new Services.Services.AvailabilityService(context));
    }

    public static Reservation AddReservation(ApplicationDbContext context, int roomId, DateTime checkIn, DateTime checkOut, string status = "confirmed", int guestId = GuestId, decimal totalPrice = 600)
    {
        var reservation = new Reservation
        {
            GuestId = guestId,
            RoomId = roomId,
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            Status = status,
            TotalPrice = totalPrice
        };

        context.Reservations.Add(reservation);
        context.SaveChanges();
        return reservation;
    }
}