# Hotel Resort – system rezerwacji pokoi hotelowych

Projekt realizowany w ramach pracy inżynierskiej. Aplikacja webowa do przeglądania oferty hotelu, sprawdzania dostępności pokoi i rezerwacji pobytu online oraz panel administracyjny do zarządzania hotelem.

## Funkcje

**Gość (bez logowania)**
- strona główna z wyszukiwarką: termin pobytu i liczba gości, dostępność i cena całego pobytu dla każdego typu pokoju
- sortowanie (cena, ocena, liczba osób) i filtrowanie pokoi po udogodnieniach i dostępności
- stopka z danymi kontaktowymi hotelu, strona 404 dla nieistniejących adresów
- profil typu pokoju: galeria zdjęć, opis, udogodnienia, ceny sezonowe i opinie gości

**Każdy zalogowany użytkownik**
- powitanie „Witaj, imię” w pasku nawigacji
- „Mój profil”: podgląd i edycja danych (imię, nazwisko, telefon, numer dokumentu), zmiana hasła
- reset zapomnianego hasła: link wysyłany e-mailem, ważny 2 godziny i jednorazowy

**Gość (zalogowany)**
- rezerwacja pokoju z usługami dodatkowymi i wyliczeniem ceny (z cennikiem sezonowym)
- lista własnych rezerwacji, szczegóły (płatności, faktura), anulowanie rezerwacji
- wystawienie opinii po zakończonym pobycie, lista własnych opinii w profilu

**Właściciel (administrator)**
- ta sama strona główna co gość, a do zarządzania czerwony przycisk „Panel Właściciela”; każda zakładka panelu ma własny adres (`#/panel/pokoje`, `#/panel/rezerwacje/12`…)
- typy pokoi (z opisem i zdjęciami), pokoje, udogodnienia, usługi dodatkowe, cennik sezonowy
- blokady pokoi (remont, konserwacja)
- wszystkie rezerwacje: zmiana statusu, rejestracja płatności, wystawianie faktur
- moderacja opinii

## Technologie

| Warstwa | Technologie |
|---------|-------------|
| Backend | ASP.NET Core Web API (.NET 10), Entity Framework Core, SQL Server, ASP.NET Core Identity, JWT, AutoMapper, Swagger |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Testy | xUnit, EF Core InMemory |

## Architektura

Backend jest aplikacją wielowarstwową (N-layer). Każda warstwa to osobny projekt i korzysta tylko z warstwy pod sobą:

```
Backend/
├── API        – warstwa prezentacji: kontrolery REST, konfiguracja (Program.cs, Extensions), uwierzytelnianie JWT
├── Services   – logika biznesowa: serwisy, interfejsy, DTO, mapowanie (AutoMapper)
├── DAL        – dostęp do danych: ApplicationDbContext (EF Core), migracje, dane startowe (DbSeeder)
├── Model      – encje bazy danych i stałe (statusy rezerwacji, pokoi, płatności, role)
└── Tests      – testy jednostkowe serwisów (opis w Tests/README.md)

Frontend/src/
├── api        – komunikacja z API (fetch), adres serwera w config.ts
├── components – widoki aplikacji (strona główna, profil pokoju, rezerwacje, panel administratora)
├── types      – typy TypeScript odpowiadające DTO z API
└── utils      – formatowanie dat i odmiana liczebników
```

Kontrolery nie odwołują się bezpośrednio do bazy danych – wywołują serwisy z warstwy `Services`, które korzystają z `ApplicationDbContext`. EF Core pełni rolę repozytorium (`DbSet<T>`) i jednostki pracy (`DbContext`).

Rejestrację i logowanie obsługuje `AuthService` (konta przez ASP.NET Core Identity). Serwis zna tylko interfejs `ITokenService` – samo wystawienie tokenu JWT (`JwtTokenService`, `API/Identity`) należy do warstwy API, bo format tokenu to szczegół komunikacji HTTP, a nie logika biznesowa (odwrócenie zależności).

Statusy i role zapisywane w bazie jako tekst są zdefiniowane w jednym miejscu, w klasach stałych w warstwie `Model` (`ReservationStatus`, `RoomStatus`, `AvailabilityStatus`, `PaymentStatus`, `PaymentMethod`, `UserRoles`, `AccountTypes`), np. `ReservationStatus.Cancelled` zamiast napisu `"cancelled"`. `Program.cs` zawiera tylko kolejność konfiguracji – szczegóły rejestracji usług są w `API/Extensions/ServiceCollectionExtensions.cs`, a dane startowe w `DAL/DbSeeder.cs`.

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
- Przy pierwszym uruchomieniu aplikacja dodaje dane startowe (`DAL/DbSeeder.cs`): role, konto właściciela, przykładowe typy pokoi, pokoje, cennik, usługi i udogodnienia.
- E-maile (reset hasła): bez serwera SMTP zapisują się jako pliki `.eml` w katalogu `Backend/API/Emails`. Żeby wysyłać prawdziwe wiadomości, uzupełnij sekcję `Email` w `appsettings.json` (`SmtpHost`, `SmtpPort`, `UserName`), a hasło do skrzynki ustaw poleceniem `dotnet user-secrets set "Email:Password" "<hasło>"`. Adres aplikacji React (linki w e-mailach, CORS) to `Frontend:BaseUrl`.
- API działa pod adresem `http://localhost:5285`, dokumentacja Swagger: `http://localhost:5285/swagger` (przycisk **Authorize** przyjmuje token z `POST /api/Auth/login`).

### 2. Frontend

W katalogu `Frontend`:

```
npm install
npm run dev
```

Aplikacja działa pod adresem `http://localhost:5173`. Adres API jest ustawiony w pliku `Frontend/.env` (`VITE_API_URL`).

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
- reset hasła tokenem ASP.NET Core Identity (ważny 2 godziny, jednorazowy); formularz nie zdradza, czy konto o danym adresie istnieje
- walidacja danych wejściowych w DTO i serwisach, kontrola rozszerzenia i rozmiaru przesyłanych zdjęć
- klucz JWT poza repozytorium (User Secrets)
