using Services.DTO;

namespace Services.Interfaces;

// Powiadomienia w aplikacji o zmianach w rezerwacjach wprowadzonych przez drugą stronę (gość <-> hotel)
public interface INotificationService
{
    // Ostatnie powiadomienia zalogowanego użytkownika, od najnowszych
    Task<List<NotificationDto>> GetUserNotificationsAsync(int userId);
    Task<bool> MarkAsReadAsync(int notificationId, int userId);
    Task MarkAllAsReadAsync(int userId);

    // Wywoływane przez serwisy rezerwacji, pokoi i blokad - zapis w tej samej transakcji co zmiana, której dotyczą
    Task NotifyUserAsync(int userId, string message, int? reservationId);
    Task NotifyOwnersAsync(string message, int? reservationId);
}