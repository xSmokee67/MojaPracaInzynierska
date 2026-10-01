using Microsoft.EntityFrameworkCore;
using Model;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

namespace DAL;

public class ApplicationDbContext : IdentityDbContext<User, IdentityRole<int>, int>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) 
        : base(options) 
    { 
    }

    public DbSet<Guest> Guests { get; set; }
    public DbSet<Owner> Owners { get; set; }
    // Usunięto: public DbSet<Hotel> Hotels { get; set; }
    public DbSet<RoomType> RoomTypes { get; set; }
    public DbSet<RoomTypePhoto> RoomTypePhotos { get; set; }
    public DbSet<Room> Rooms { get; set; }
    public DbSet<Amenity> Amenities { get; set; }
    public DbSet<Availability> Availabilities { get; set; }
    public DbSet<RoomBlock> RoomBlocks { get; set; }
    public DbSet<Reservation> Reservations { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<Invoice> Invoices { get; set; }
    public DbSet<PriceListEntry> PriceListEntries { get; set; }
    public DbSet<AdditionalService> AdditionalServices { get; set; }
    public DbSet<ReservationService> ReservationServices { get; set; }
    public DbSet<Review> Reviews { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().UseTptMappingStrategy();

        modelBuilder.Entity<ReservationService>()
            .HasKey(rs => new { rs.ReservationId, rs.ServiceId });

        modelBuilder.Entity<ReservationService>()
            .HasOne(rs => rs.Reservation)
            .WithMany(r => r.ReservationServices)
            .HasForeignKey(rs => rs.ReservationId);

        modelBuilder.Entity<ReservationService>()
            .HasOne(rs => rs.AdditionalService)
            .WithMany(s => s.ReservationServices)
            .HasForeignKey(rs => rs.ServiceId);

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Invoice)
            .WithOne(i => i.Reservation)
            .HasForeignKey<Invoice>(i => i.ReservationId)
            .IsRequired(false);

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Review)
            .WithOne(rev => rev.Reservation)
            .HasForeignKey<Review>(rev => rev.ReservationId)
            .IsRequired(false);

        modelBuilder.Entity<AdditionalService>()
            .HasKey(s => s.ServiceId);

        modelBuilder.Entity<RoomTypePhoto>()
            .HasOne(p => p.RoomType)
            .WithMany(rt => rt.Photos)
            .HasForeignKey(p => p.RoomTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        foreach (var property in modelBuilder.Model.GetEntityTypes()
            .SelectMany(t => t.GetProperties())
            .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetColumnType("decimal(18,2)");
        }
    }
}