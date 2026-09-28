namespace Services.DTO;

public class RoomBlockDto
{
    public int RoomBlockId {get; set; }
    public int RoomId {get; set; }
    public string RoomNumber {get; set; } = string.Empty;
    public int OwnerId {get; set; }
    public string OwnerName {get; set; } = string.Empty;
    public DateTime StartDate {get; set; }
    public DateTime EndDate {get; set; }
    public string Reason {get; set; } = string.Empty;
}