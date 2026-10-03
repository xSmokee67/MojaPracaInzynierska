using Services.DTO;

namespace Services.Interfaces;

public interface IReviewService
{
    Task<List<ReviewDto>> GetAllReviewsAsync();
    Task<bool> CreateReviewAsync(ReviewDto dto);
    Task<bool> DeleteReviewAsync(int reviewId);
}