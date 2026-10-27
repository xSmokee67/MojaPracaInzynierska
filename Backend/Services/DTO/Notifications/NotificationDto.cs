namespace Services.DTO;

public class NotificationDto
{
    public int NotificationId {get; set; }
    public int? ReservationId {get; set; }
    public string Message {get; set; } = string.Empty;
    public DateTime CreatedAt {get; set; }
    public bool IsRead {get; set; }
}