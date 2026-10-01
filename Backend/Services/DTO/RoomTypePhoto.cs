namespace Services.DTO;

public class RoomTypePhotoDto
{
    public int RoomTypePhotoId {get; set; }
    public string PhotoUrl {get; set; } = string.Empty;
    public int SortOrder {get; set; }
}