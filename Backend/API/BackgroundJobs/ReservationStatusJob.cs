using Services.Interfaces;

namespace API.BackgroundJobs;

// Zadanie w tle: automatyczne statusy rezerwacji (ReservationService.UpdateExpiredReservationsAsync) przy starcie API i potem co godzinę.
// Zmiana daty o północy zostaje uwzględniona najpóźniej godzinę później.
public class ReservationStatusJob : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReservationStatusJob> _logger;

    public ReservationStatusJob(IServiceScopeFactory scopeFactory, ILogger<ReservationStatusJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        do
        {
            try
            {
                // Serwisy i DbContext działają w zakresie jednego żądania - zadanie w tle tworzy własny zakres na każdy przebieg
                using var scope = _scopeFactory.CreateScope();
                var reservationService = scope.ServiceProvider.GetRequiredService<IReservationService>();

                var updated = await reservationService.UpdateExpiredReservationsAsync();
                if (updated > 0)
                {
                    _logger.LogInformation("Automatyczna zmiana statusu: {Count} rezerwacji.", updated);
                }
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                // Błąd jednego przebiegu (np. chwilowy brak połączenia z bazą) nie zatrzymuje zadania - kolejna próba za godzinę
                _logger.LogError(e, "Błąd automatycznej zmiany statusów rezerwacji.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}