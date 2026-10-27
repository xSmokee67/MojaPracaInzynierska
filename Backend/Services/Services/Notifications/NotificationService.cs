using DAL;
using Microsoft.EntityFrameworkCore;
using Model;
using Services.DTO;
using Services.Interfaces;

namespace Services.Services;

public class NotificationService : INotificationService
{
    // Ile ostatnich powiadomień pokazuje lista pod ikoną dzwonka
    private const int MaxNotifications = 30;

    private readonly ApplicationDbContext _context;

    public NotificationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<NotificationDto>> GetUserNotificationsAsync(int userId)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ThenByDescending(n => n.NotificationId)
            .Take(MaxNotifications)
            .Select(n => new NotificationDto
            {
                NotificationId = n.NotificationId,
                ReservationId = n.ReservationId,
                Message = n.Message,
                CreatedAt = n.CreatedAt,
                IsRead = n.IsRead
            }).ToListAsync();
    }

    public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
    {
        var notification = await _context.Notifications.FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == userId);
        if (notification == null)
        {
            return false;
        }

        notification.IsRead = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        var unread = await _context.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var notification in unread)
        {
            notification.IsRead = true;
        }

        await _context.SaveChangesAsync();
    }

    public async Task NotifyUserAsync(int userId, string message, int? reservationId)
    {
        _context.Notifications.Add(CreateNotification(userId, message, reservationId));
        await _context.SaveChangesAsync();
    }

    // Każde konto właściciela dostaje własną kopię powiadomienia (osobny stan "przeczytane")
    public async Task NotifyOwnersAsync(string message, int? reservationId)
    {
        var ownerIds = await _context.Owners.Select(o => o.Id).ToListAsync();
        foreach (var ownerId in ownerIds)
        {
            _context.Notifications.Add(CreateNotification(ownerId, message, reservationId));
        }

        await _context.SaveChangesAsync();
    }

    private static Notification CreateNotification(int userId, string message, int? reservationId) => new()
    {
        UserId = userId,
        ReservationId = reservationId,
        Message = message,
        CreatedAt = DateTime.Now,
        IsRead = false
    };
}