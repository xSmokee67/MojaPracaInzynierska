namespace Model;

public class RoomTypePhoto
{
    public int RoomTypePhotoId {get; set; }
    public int RoomTypeId {get; set; }
    public string PhotoUrl {get; set; } = string.Empty;
    public int SortOrder {get; set; }

    public virtual RoomType RoomType { get; set; } = null!;
}