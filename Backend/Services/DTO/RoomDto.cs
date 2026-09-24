namespace Services.DTO;

public class RoomDto
{
    public int RoomId {get; set;}
    public int RoomTypeId {get; set;}
    public string RoomTypeName {get; set; } = string.Empty;
    public string RoomNumber {get; set; } = string.Empty;
    public string Status {get; set; } = string.Empty;
}