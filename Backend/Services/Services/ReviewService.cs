using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.Constants;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class ReviewService : IReviewService
{
    private readonly ApplicationDbContext _context;

    public ReviewService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ReviewDto>> GetAllReviewsAsync()
    {
        return await GetReviewsAsync(null);
    }

    // Opinie wystawione przez gościa (strona "Mój profil")
    public async Task<List<ReviewDto>> GetGuestReviewsAsync(int guestId)
    {
        return await GetReviewsAsync(guestId);
    }

    private async Task<List<ReviewDto>> GetReviewsAsync(int? guestId)
    {
        return await _context.Reviews
            .Include(r => r.Guest)
            .Include(r => r.Reservation)
                .ThenInclude(res => res.Room)
                    .ThenInclude(room => room.RoomType)
            .Where(r => guestId == null || r.GuestId == guestId)
            .OrderByDescending(r => r.Date)
            .Select(r => new ReviewDto
            {
                ReviewId = r.ReviewId,
                GuestId = r.GuestId,
                GuestName = r.Guest.FirstName + " " + r.Guest.LastName,
                ReservationId = r.ReservationId,
                RoomTypeName = r.Reservation.Room.RoomType.Name,
                Rating = r.Rating,
                Comment = r.Comment,
                Date = r.Date
            }).ToListAsync();
    }

    // Gość może ocenić tylko własny, zakończony pobyt - i tylko raz
    public async Task<bool> CreateReviewAsync(ReviewDto dto)
    {
        if (dto.Rating < 1 || dto.Rating > 5)
        {
            throw new ArgumentException("Ocena musi mieścić się w zakresie 1-5.");
        }

        var reservation = await _context.Reservations
            .Include(r => r.Review)
            .FirstOrDefaultAsync(r => r.ReservationId == dto.ReservationId && r.GuestId == dto.GuestId);

        if (reservation == null)
        {
            return false;
        }

        if (reservation.Status != ReservationStatus.Completed)
        {
            throw new ArgumentException("Opinię można dodać dopiero po zakończonym pobycie.");
        }

        if (reservation.Review != null)
        {
            throw new ArgumentException("Opinia do tego pobytu została już dodana.");
        }

        var review = new Review
        {
            GuestId = dto.GuestId,
            ReservationId = reservation.ReservationId,
            Rating = dto.Rating,
            Comment = dto.Comment,
            Date = DateTime.UtcNow
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteReviewAsync(int reviewId)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null)
        {
            return false;
        }

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        return true;
    }
}