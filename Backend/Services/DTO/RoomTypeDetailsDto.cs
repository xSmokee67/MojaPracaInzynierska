namespace Services.DTO;

// Publiczny profil typu pokoju (strona pokoju)
public class RoomTypeDetailsDto
{
    public int RoomTypeId {get; set; }
    public string Name {get; set; } = string.Empty;
    public string Description {get; set; } = string.Empty;
    public decimal BasePrice {get; set; }
    public int MaxOccupancy {get; set; }
    public int RoomCount {get; set; }
    public List<RoomTypePhotoDto> Photos {get; set; } = new ();
    public List<string> Amenities {get; set; } = new ();
    public List<PriceListEntryDto> SeasonalPrices {get; set; } = new ();
    public double? AverageRating {get; set; }
    public int ReviewCount {get; set; }
    public List<ReviewDto> LatestReviews {get; set; } = new ();
}