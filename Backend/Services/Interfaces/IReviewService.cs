using Services.DTO;

namespace Services.Interfaces;

public interface IReviewService
{
    Task<List<ReviewDto>> GetAllReviewsAsync();
    Task<List<ReviewDto>> GetGuestReviewsAsync(int guestId);
    Task<bool> CreateReviewAsync(ReviewDto dto);
    Task<bool> DeleteReviewAsync(int reviewId);
}