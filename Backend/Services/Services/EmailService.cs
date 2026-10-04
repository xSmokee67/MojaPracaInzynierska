using Microsoft.Extensions.Logging;
using Services.Interfaces;
using Services.Settings;
using System.Net;
using System.Net.Mail;
using System.Text;

namespace Services.Services;

public class EmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(EmailSettings settings, ILogger<EmailService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    // Błąd wysyłki nie może przerwać operacji biznesowej (np. utworzenia rezerwacji) - jest tylko logowany
    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(_settings.From, _settings.FromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true,
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8
            };
            message.To.Add(to);

            using var client = new SmtpClient();

            if (string.IsNullOrWhiteSpace(_settings.SmtpHost))
            {
                // Brak serwera SMTP - wiadomość zapisywana jako plik .eml (do podglądu w kliencie poczty)
                var directory = Path.GetFullPath(_settings.PickupDirectory);
                Directory.CreateDirectory(directory);

                client.DeliveryMethod = SmtpDeliveryMethod.SpecifiedPickupDirectory;
                client.PickupDirectoryLocation = directory;
            }
            else
            {
                client.Host = _settings.SmtpHost;
                client.Port = _settings.SmtpPort;
                client.EnableSsl = _settings.EnableSsl;

                if (!string.IsNullOrWhiteSpace(_settings.UserName))
                {
                    client.Credentials = new NetworkCredential(_settings.UserName, _settings.Password);
                }
            }

            await client.SendMailAsync(message);
            _logger.LogInformation("Wysłano e-mail \"{Subject}\" do {To}", subject, to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Nie udało się wysłać e-maila \"{Subject}\" do {To}", subject, to);
        }
    }
}
