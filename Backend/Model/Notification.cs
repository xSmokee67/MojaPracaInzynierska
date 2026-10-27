using System;

namespace Model;

// Powiadomienie w aplikacji (ikona dzwonka) o zmianie w rezerwacji - dla gościa albo właściciela
public class Notification
{
    public int NotificationId { get; set; }
    public int UserId { get; set; }
    public int? ReservationId { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }

    public virtual User User { get; set; } = null!;
    public virtual Reservation? Reservation { get; set; }
}