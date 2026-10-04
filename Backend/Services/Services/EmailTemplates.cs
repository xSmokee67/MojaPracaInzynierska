namespace Services.Services;

// Treści wiadomości e-mail wysyłanych do użytkowników (HTML)
public static class EmailTemplates
{
    public static string PasswordReset(string firstName, string resetLink, int validHours)
    {
        return Layout($"Witaj, {Html(firstName)}!",
            "<p>Otrzymaliśmy prośbę o ustawienie nowego hasła do Twojego konta w systemie rezerwacji Hotel Resort.</p>" +
            $"<p><a href=\"{Html(resetLink)}\" style=\"display:inline-block;padding:10px 20px;background:#059669;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold\">Ustaw nowe hasło</a></p>" +
            $"<p>Link jest ważny przez {validHours} godz. i można go użyć tylko raz.</p>" +
            "<p>Jeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość - Twoje hasło pozostanie bez zmian.</p>");
    }

    // Kodowanie tylko znaków specjalnych HTML - polskie litery zostają czytelne (WebUtility.HtmlEncode zamienia je na encje)
    private static string Html(string text)
    {
        return text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
    }

    private static string Layout(string headline, string content)
    {
        return "<div style=\"font-family:Arial,sans-serif;max-width:560px;color:#1e293b\">" +
            $"<h2 style=\"color:#059669\">{headline}</h2>{content}" +
            "<p style=\"margin-top:24px;color:#64748b;font-size:12px\">Hotel Resort - wiadomość wygenerowana automatycznie, prosimy na nią nie odpowiadać.</p>" +
            "</div>";
    }
}