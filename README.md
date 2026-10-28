# Hotel Resort – system rezerwacji pokoi hotelowych

Projekt realizowany w ramach pracy inżynierskiej. Aplikacja webowa do przeglądania oferty hotelu, sprawdzania dostępności pokoi i rezerwacji pobytu online oraz panel administracyjny do zarządzania hotelem.

## Funkcje

**Gość (bez logowania)**
- strona główna z wyszukiwarką: termin pobytu i liczba gości, dostępność i cena całego pobytu dla każdego typu pokoju
- sortowanie (cena, ocena, liczba osób) i filtrowanie pokoi po udogodnieniach i dostępności
- stopka z danymi kontaktowymi hotelu, strona 404 dla nieistniejących adresów
- profil typu pokoju: galeria zdjęć, opis, udogodnienia, ceny sezonowe i opinie gości
- kalendarz dostępności typu pokoju na stronie pokoju: liczba wolnych pokoi w każdej nocy miesiąca, wybór terminu kliknięciem (przyjazd, wyjazd) i od razu cena pobytu

**Każdy zalogowany użytkownik**
- powitanie „Witaj, imię” w pasku nawigacji
- „Mój profil”: podgląd danych konta (gość: także lista własnych opinii)
- powiadomienia o zmianach w rezerwacjach (dzwonek w pasku nawigacji z liczbą nieprzeczytanych); kliknięcie powiadomienia otwiera szczegóły rezerwacji

**Gość (zalogowany)**
- rezerwacja pokoju z usługami dodatkowymi i wyliczeniem ceny (z cennikiem sezonowym)
- lista własnych rezerwacji, szczegóły (płatności, faktura), anulowanie rezerwacji
- zmiana terminu rezerwacji (najpóźniej dzień przed zameldowaniem): sprawdzenie dostępności nowego terminu i przeliczenie ceny
- wystawienie opinii po zakończonym pobycie, lista własnych opinii w profilu

**Właściciel (administrator)**
- ta sama strona główna co gość, a do zarządzania czerwony przycisk „Panel Właściciela”; każda zakładka panelu ma własny adres (`#/panel/pokoje`, `#/panel/rezerwacje/12`…)
- kalendarz dostępności (pierwsza zakładka panelu): siatka pokoje × noce z wolnymi, zarezerwowanymi i zablokowanymi nocami, obłożenie hotelu w wybranym okresie, liczba wolnych pokoi na każdą noc; kliknięcie rezerwacji otwiera jej szczegóły
- typy pokoi (z opisem i zdjęciami), pokoje, udogodnienia, usługi dodatkowe, cennik sezonowy
- blokady pokoi (remont, konserwacja); remont, wyłączenie pokoju albo blokada przenosi przyszłe rezerwacje do innych wolnych pokoi tego typu
- wszystkie rezerwacje: zmiana statusu, zmiana terminu (także przedłużenie trwającego pobytu), rejestracja płatności, wystawianie faktur
- moderacja opinii

## Technologie

| Warstwa | Technologie |
|---------|-------------|
| Backend | ASP.NET Core Web API (.NET 10), Entity Framework Core, SQL Server, ASP.NET Core Identity, JWT, AutoMapper, Swagger |
| Frontend | React 19 (JavaScript, JSX), Vite, Tailwind CSS (kolory i krój nagłówków hotelu w `index.css`) |
| Testy | xUnit, EF Core InMemory |

## Architektura

Backend jest aplikacją wielowarstwową (N-layer). Każda warstwa to osobny projekt i korzysta tylko z warstwy pod sobą:

```
Backend/
├── API        – warstwa prezentacji: kontrolery REST, konfiguracja (Program.cs, Extensions), uwierzytelnianie JWT, dane startowe (Data/DbSeeder)
├── Services   – logika biznesowa: serwisy, interfejsy, DTO, mapowanie (AutoMapper), stałe statusów i ról (Constants)
├── DAL        – dostęp do danych: ApplicationDbContext (EF Core), migracje
├── Model      – encje bazy danych
└── Tests      – testy jednostkowe serwisów (opis w Tests/README.md)

Frontend/src/
├── api        – komunikacja z API: wspólna funkcja apiRequest (apiClient.js), adres serwera w config.js
├── assets     – zdjęcie w tle strony głównej
├── components – widoki aplikacji pogrupowane w katalogi (opis niżej)
└── utils      – formatowanie dat, odmiana liczebników, polskie nazwy i kolory statusów (statuses.js)
```

Pliki są pogrupowane według obszaru systemu – te same nazwy katalogów w każdej warstwie, więc np. cały moduł dostępności leży w katalogach `Availability`:

| Katalog | Co zawiera (w `Services/DTO`, `Services/Interfaces`, `Services/Services` i `API/Controllers`) |
|---------|------------------------------------------------------------------------------------------------|
| `Availability` | moduł zarządzania dostępnością: `AvailabilityService` (reguła dostępności, kalendarz, blokady wierszy), `RoomBlockService` (blokady pokoi) |
| `Reservations` | proces rezerwacji: wyszukiwarka, cena pobytu, tworzenie i anulowanie, statusy, płatności i faktury (`ReservationService`) |
| `Rooms` | typy pokoi, pokoje fizyczne, udogodnienia, zdjęcia typów pokoi |
| `Pricing` | cennik sezonowy i usługi dodatkowe |
| `Reviews` | opinie gości |
| `Accounts` | rejestracja, logowanie (JWT) i profil użytkownika |
| `Notifications` | powiadomienia o zmianach w rezerwacjach (`NotificationService`) |

Wspólne dla wszystkich obszarów zostają w katalogach `Services/Constants` (statusy i role), `Services/Mapping` (AutoMapper) i `Services/Settings`. Przestrzenie nazw się nie zmieniają (`Services.DTO`, `Services.Interfaces`, `Services.Services`, `API.Controllers`) – katalogi służą tylko porządkowi plików.

Frontend (`components`): `rooms` – strona główna z wyszukiwarką, profil typu pokoju i kalendarz dostępności; `reservations` – formularz rezerwacji, „Moje rezerwacje”, szczegóły rezerwacji; `account` – logowanie, rejestracja, profil; `admin` – Panel Właściciela i jego zakładki; `common` – elementy wspólne (Alert, StarRating, dzwonek powiadomień, stopka, strona 404).

Kontrolery nie odwołują się bezpośrednio do bazy danych – wywołują serwisy z warstwy `Services`, które korzystają z `ApplicationDbContext`. EF Core pełni rolę repozytorium (`DbSet<T>`) i jednostki pracy (`DbContext`).

Moduł zarządzania dostępnością to `AvailabilityService` (`IAvailabilityService`) – jedyne miejsce, które decyduje, czy pokój jest wolny w danym terminie. Pokój jest wolny, gdy ma status `available` i w terminie nie ma nieanulowanej rezerwacji ani blokady. Terminy to przedziały [początek, koniec), więc dzień wymeldowania jest już wolny dla kolejnego gościa; reguła kolizji (`A.początek < B.koniec i A.koniec > B.początek`) jest zapisana raz i używana zarówno dla rezerwacji, jak i blokad. Z modułu korzystają: wyszukiwarka i tworzenie rezerwacji (`ReservationService` – przydział pierwszego wolnego pokoju), zakładanie blokad (`RoomBlockService` – blokada nie może nachodzić na rezerwację ani inną blokadę) oraz endpoint `GET /api/Reservation/availability`. Moduł prowadzi też kalendarz dostępności (tabela `Availability`: status `free` / `booked` / `blocked` dla każdej nocy) i udostępnia właścicielowi widok kalendarza (`GET /api/Availability/calendar?from=&to=`, maks. 62 noce): dla każdego pokoju i każdej nocy status wraz z numerem rezerwacji i gościem albo powodem blokady. Widok jest liczony z rezerwacji i blokad tą samą regułą kolizji co wyszukiwarka, więc zawsze pokazuje to samo, co zobaczy gość przy rezerwacji. Dla gości moduł udostępnia kalendarz typu pokoju (`GET /api/Availability/room-type/{id}?from=&to=`, bez logowania): liczbę wolnych pokoi w każdej nocy, bez danych o rezerwacjach. Wolny pokój w każdej nocy nie oznacza jeszcze, że jeden pokój jest wolny przez cały pobyt (gość musiałby zmieniać pokoje) – dlatego termin wybrany w kalendarzu jest na końcu sprawdzany tak samo jak w wyszukiwarce.

Ochrona przed równoczesną rezerwacją: utworzenie rezerwacji (`ReservationService`) i blokady (`RoomBlockService`) odbywa się w jednej transakcji bazy danych. Na jej początku moduł dostępności zakłada blokadę pesymistyczną na wiersze pokoi danego typu (`SELECT … WITH (UPDLOCK)`), trwającą do końca transakcji. Gdy dwóch gości rezerwuje w tej samej chwili ostatni wolny pokój, drugie żądanie czeka na zakończenie pierwszego, a potem sprawdza dostępność na aktualnych danych i dostaje komunikat, że pokój został przed chwilą zarezerwowany. Transakcja zapewnia też, że rezerwacja i kalendarz dostępności zapisują się razem albo wcale.

Zmiana terminu rezerwacji (`PUT /api/Reservation/{id}/dates`, `ReservationService.ChangeReservationDatesAsync`) przebiega w tej samej transakcji z blokadą pokoi danego typu. Moduł dostępności szuka wolnych pokoi w nowym terminie z pominięciem zmienianej rezerwacji (jej obecne noce nie blokują nowego terminu, np. przy przedłużeniu pobytu). Gość zostaje w swoim pokoju, jeśli jest on wolny w nowym terminie; w przeciwnym razie rezerwacja trafia do innego wolnego pokoju tego samego typu, a gdy takiego nie ma – zmiana jest odrzucana. Cena noclegów jest przeliczana według cennika dla nowego terminu, usługi dodatkowe zostają w cenach z chwili rezerwacji, a kalendarz dostępności zwalnia stare noce i zajmuje nowe. Gość może zmienić termin najpóźniej dzień przed zameldowaniem, właściciel – także w trakcie pobytu (bez zmiany daty zameldowania).

Przeniesienie gości (`AvailabilityService.RelocateReservationsAsync`): gdy pokój przechodzi w remont, zostaje wyłączony, zmienia typ albo dostaje blokadę, jego przyszłe rezerwacje (oczekujące i potwierdzone) trafiają do innych pokoi tego samego typu, wolnych przez cały pobyt danej rezerwacji. Dzieje się to w jednej transakcji z blokadą pokoi danego typu: jeśli choć jednej rezerwacji nie da się przenieść, cała zmiana jest odrzucana z listą takich rezerwacji, a pokój pozostaje bez zmian. Gość, który już mieszka w pokoju, nie jest przenoszony automatycznie – zmiana jest możliwa po jego wymeldowaniu. Sprzątanie jest stanem chwilowym i nie przenosi rezerwacji. API zwraca listę przeniesień, a panel pokazuje ją w komunikacie.

Powiadomienia (`NotificationService`, tabela `Notifications`): zmiana w rezerwacji zapisuje powiadomienie dla drugiej strony – gość dowiaduje się o zmianie statusu przez hotel, zmianie terminu przez hotel i przeniesieniu do innego pokoju, a właściciel o nowej rezerwacji, anulowaniu i zmianie terminu przez gościa. Przy tworzeniu rezerwacji, zmianie terminu i przeniesieniu powiadomienie zapisuje się w tej samej transakcji co sama zmiana. Dzwonek w pasku nawigacji pobiera listę (`GET /api/Notification`, 30 najnowszych) przy przejściu na inną stronę i co minutę; kliknięcie oznacza powiadomienie jako przeczytane (`PUT /api/Notification/{id}/read`) i otwiera szczegóły rezerwacji (`#/moje-rezerwacje/12` dla gościa, `#/panel/rezerwacje/12` dla właściciela).

Rejestrację i logowanie obsługuje `AuthService` (konta przez ASP.NET Core Identity). Serwis zna tylko interfejs `ITokenService` – samo wystawienie tokenu JWT (`JwtTokenService`, `API/Identity`) należy do warstwy API, bo format tokenu to szczegół komunikacji HTTP, a nie logika biznesowa (odwrócenie zależności).

Statusy i role zapisywane w bazie jako tekst są zdefiniowane w jednym miejscu, w klasach stałych w `Services/Constants` (`ReservationStatus`, `RoomStatus`, `AvailabilityStatus`, `PaymentStatus`, `PaymentMethod`, `UserRoles`, `AccountTypes`), np. `ReservationStatus.Cancelled` zamiast napisu `"cancelled"`. Należą do warstwy logiki biznesowej, bo to serwisy decydują, które statusy są dozwolone i jakie przejścia między nimi są możliwe. `Program.cs` zawiera tylko kolejność konfiguracji – szczegóły rejestracji usług są w `API/Extensions/ServiceCollectionExtensions.cs`, a dane startowe w `API/Data/DbSeeder.cs` (uruchamiane przy starcie API, które widzi wszystkie warstwy).

Frontend: wszystkie wywołania API (poza logowaniem i rejestracją) przechodzą przez `apiRequest` w `api/apiClient.js`: funkcja dokleja adres serwera, nagłówek z tokenem JWT i zamienia błędną odpowiedź na komunikat dla użytkownika (`api/apiErrors.js` – 401 wylogowuje, 403 to brak uprawnień, inne błędy pokazują `{ error }` z API). Logowanie ma własną obsługę, bo tam 401 oznacza złe hasło, a nie wygasłą sesję. Daty są wyświetlane przez `formatDate` / `formatDateTime` z `utils/format.js`, zawsze w formacie polskim.

## Uruchomienie

### Wymagania

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- SQL Server LocalDB (instalowany razem z Visual Studio) lub inny SQL Server
- [Node.js](https://nodejs.org/) 20.19+ lub 22.12+
- narzędzie EF Core: `dotnet tool install --global dotnet-ef`

### 1. Backend

W katalogu `Backend/API`:

```
dotnet user-secrets set "Jwt:Key" "<losowy ciąg min. 32 znaków>"
dotnet ef database update --project ../DAL
dotnet run
```

- Klucz podpisu tokenów JWT nie jest trzymany w repozytorium – przechowują go User Secrets na komputerze dewelopera.
- `dotnet ef database update` tworzy bazę `HotelReservationDb` (connection string w `appsettings.json`).
- Przy pierwszym uruchomieniu aplikacja dodaje dane startowe (`API/Data/DbSeeder.cs`): role, konto właściciela, przykładowe typy pokoi, pokoje, cennik, usługi i udogodnienia.
- Adres aplikacji React, z którego API przyjmuje zapytania (CORS), to `Frontend:BaseUrl` w `appsettings.json`.
- API działa pod adresem `http://localhost:5285`, dokumentacja Swagger: `http://localhost:5285/swagger` (przycisk **Authorize** przyjmuje token z `POST /api/Auth/login`).

### 2. Frontend

W katalogu `Frontend`:

```
npm install
npm run dev
```

Aplikacja działa pod adresem `http://localhost:5173`. Adres API jest ustawiony w pliku `Frontend/.env` (`VITE_API_URL`).

Wersja produkcyjna (szybsza niż tryb deweloperski): `npm run build`, a potem `npm run preview` – działa pod tym samym adresem, więc najpierw trzeba zatrzymać `npm run dev`.

### 3. Konto właściciela

| E-mail | Hasło |
|--------|-------|
| admin@hotel.com | Admin123! |

Konto gościa zakłada się przez formularz rejestracji.

## Testy

W katalogu `Backend`:

```
dotnet test
```

Opis testów jednostkowych i scenariusze testów manualnych: [Backend/Tests/README.md](Backend/Tests/README.md).

## Bezpieczeństwo

- uwierzytelnianie tokenem JWT (ważny 3 godziny), autoryzacja oparta na rolach (`Owner`, `Guest`)
- hasła hashowane przez ASP.NET Core Identity (min. 8 znaków, w tym cyfra)
- blokada konta na 15 minut po 5 nieudanych próbach logowania
- walidacja danych wejściowych w DTO i serwisach, kontrola rozszerzenia i rozmiaru przesyłanych zdjęć
- klucz JWT poza repozytorium (User Secrets)
