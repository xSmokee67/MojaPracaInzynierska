# Hotel Resort – system rezerwacji pokoi hotelowych

Projekt realizowany w ramach pracy inżynierskiej. Aplikacja webowa do przeglądania oferty hotelu, sprawdzania dostępności pokoi i rezerwacji pobytu online oraz panel administracyjny do zarządzania hotelem.

## Funkcje

**Gość (bez logowania)**
- strona główna z wyszukiwarką: termin pobytu i liczba gości, dostępność i cena całego pobytu dla każdego typu pokoju
- sortowanie (cena, ocena, liczba osób) i filtrowanie pokoi po udogodnieniach i dostępności
- stopka z danymi kontaktowymi hotelu, strona 404 dla nieistniejących adresów
- profil typu pokoju: galeria zdjęć, opis, udogodnienia, ceny sezonowe i opinie gości
- kalendarz dostępności typu pokoju na stronie pokoju: liczba wolnych pokoi w każdej nocy miesiąca, wybór terminu kliknięciem (przyjazd, wyjazd) i od razu cena pobytu
- gdy w wybranym terminie nie ma wolnego pokoju: propozycje najbliższych wolnych terminów tej samej długości z ceną (na stronie pokoju i w formularzu rezerwacji), wybór jednym kliknięciem

**Każdy zalogowany użytkownik**
- powitanie „Witaj, imię” w pasku nawigacji
- „Mój profil”: podgląd danych konta (gość: także lista własnych opinii)
- powiadomienia o zmianach w rezerwacjach (dzwonek w pasku nawigacji z liczbą nieprzeczytanych); kliknięcie powiadomienia otwiera szczegóły rezerwacji

**Gość (zalogowany)**
- rezerwacja pokoju z usługami dodatkowymi i wyliczeniem ceny (cena za pokój za noc z cennikiem sezonowym, usługi według sposobu naliczania – np. śniadanie za osobę za noc); liczba gości zapisywana w rezerwacji i sprawdzana z pojemnością pokoju (API odrzuca rezerwację, w której gości jest więcej, niż mieści pokój)
- lista własnych rezerwacji, szczegóły (płatności, faktura), anulowanie rezerwacji
- informacja o płatności w szczegółach rezerwacji: kwota, termin, tytuł przelewu i płatność w recepcji (gotówka, karta, BLIK) – wpłatę zapisuje hotel
- wystawienie opinii po zakończonym pobycie, lista własnych opinii w profilu

**Właściciel (administrator)**
- ta sama strona główna co gość, a do zarządzania link „Panel właściciela” w pasku nawigacji; panel ma menu boczne z grupami zakładek (Przegląd, Oferta, Obsługa), a każda zakładka – własny adres (`#/panel/pokoje`, `#/panel/rezerwacje/12`…)
- kalendarz dostępności (pierwsza zakładka panelu): siatka pokoje × noce z wolnymi, zarezerwowanymi i zablokowanymi nocami, obłożenie hotelu w wybranym okresie, liczba wolnych pokoi na każdą noc; kliknięcie rezerwacji otwiera jej szczegóły
- typy pokoi (z opisem i zdjęciami), pokoje, udogodnienia, usługi dodatkowe (ze sposobem naliczania: raz za pobyt, za noc, za osobę, za osobę za noc), cennik sezonowy
- blokady pokoi (remont, konserwacja); remont, wyłączenie pokoju albo blokada przenosi przyszłe rezerwacje do innych wolnych pokoi tego typu
- wszystkie rezerwacje: zmiana statusu, rejestracja płatności, wystawianie faktur
- płatność za rezerwację: termin 3 dni od rezerwacji (najpóźniej dzień przed przyjazdem); gość płaci przelewem albo w recepcji, a hotel rejestruje wpłatę w panelu – wpłata całej kwoty automatycznie potwierdza rezerwację
- automatyczne statusy rezerwacji: nieopłacona w terminie → anulowana (noce wracają do puli wolnych pokoi), potwierdzona po dniu wymeldowania → zakończona
- moderacja opinii

## Technologie

| Warstwa | Technologie |
|---------|-------------|
| Backend | ASP.NET Core Web API (.NET 10), Entity Framework Core, SQL Server, ASP.NET Core Identity, JWT, AutoMapper, Swagger |
| Frontend | React 19 (JavaScript, JSX), Vite, Tailwind CSS (kolory hotelu, kroje pisma Space Grotesk i Inter oraz wspólne klasy przycisków, pól i kart w `index.css`) |
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
├── assets     – zdjęcie hotelu (strona główna i ekran logowania)
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

Wygląd (styl szwajcarski): nagłówki krojem geometrycznym Space Grotesk, tekst krojem Inter (pliki czcionek w paczkach `@fontsource-variable` – działają bez internetu), granatowy kolor główny, mosiężne akcenty i ciepłe, piaskowe tła sekcji. Kolory, kroje i wspólne klasy (`btn-primary`, `btn-outline`, `chip`, `field`, `card`, `data-table`…) są zdefiniowane raz, w `Frontend/src/index.css`. Strona główna: zdjęcie hotelu z wyszukiwarką, pod nią kafelki pokoi, a po wyszukaniu – lista wyników z filtrami z boku i ceną całego pobytu. Strona pokoju: galeria, opis, kalendarz dostępności i pudełko rezerwacji obok. „Moje rezerwacje”: lista po lewej, szczegóły wybranej rezerwacji po prawej.

Kontrolery nie odwołują się bezpośrednio do bazy danych – wywołują serwisy z warstwy `Services`, które korzystają z `ApplicationDbContext`. EF Core pełni rolę repozytorium (`DbSet<T>`) i jednostki pracy (`DbContext`).

Moduł zarządzania dostępnością to `AvailabilityService` (`IAvailabilityService`) – jedyne miejsce, które decyduje, czy pokój jest wolny w danym terminie. Pokój jest wolny, gdy ma status `available` (nie jest w remoncie ani wyłączony) i w terminie nie ma blokady ani rezerwacji, która zajmuje pokój (anulowana rezerwacja – przez gościa, hotel albo automatycznie z powodu braku wpłaty – go nie zajmuje, jej noce wracają do puli wolnych). Terminy to przedziały [początek, koniec), więc dzień wymeldowania jest już wolny dla kolejnego gościa; reguła kolizji (`A.początek < B.koniec i A.koniec > B.początek`) jest zapisana raz i używana zarówno dla rezerwacji, jak i blokad. Z modułu korzystają: wyszukiwarka i tworzenie rezerwacji (`ReservationService` – przydział pierwszego wolnego pokoju), zakładanie blokad (`RoomBlockService` – blokada nie może nachodzić na rezerwację ani inną blokadę) oraz endpoint `GET /api/Reservation/availability`. Dostępność nie jest przechowywana w osobnej tabeli – jest zawsze wyliczana na bieżąco z rezerwacji i blokad, więc nie ma drugiego źródła prawdy, które mogłoby się rozjechać z rezerwacjami (wcześniejsza tabela `Availabilities` z kopią statusu każdej nocy była tylko zapisywana i niczym nieodczytywana – usunęła ją migracja `RemoveAvailabilityTable`). Moduł udostępnia właścicielowi widok kalendarza (`GET /api/Availability/calendar?from=&to=`, maks. 62 noce): dla każdego pokoju i każdej nocy status wraz z numerem rezerwacji i gościem albo powodem blokady. Widok jest liczony z rezerwacji i blokad tą samą regułą kolizji co wyszukiwarka, więc zawsze pokazuje to samo, co zobaczy gość przy rezerwacji. Gdy w wybranym terminie nie ma wolnego pokoju, moduł szuka innych terminów tej samej długości (`FindAlternativeStaysAsync`, `GET /api/Reservation/alternatives?roomTypeId=&checkIn=&checkOut=`, bez logowania): sprawdza kolejno dzień wcześniej, dzień później, dwa dni wcześniej… – najdalej 2 tygodnie w każdą stronę, nigdy w przeszłości – i zwraca 3 najbliższe terminy, w których jeden pokój jest wolny przez cały pobyt, wraz z ceną według cennika. Rezerwacje i blokady z całego okna są wczytywane jednym zapytaniem, a każdy termin sprawdzany jest tą samą regułą kolizji co w wyszukiwarce. Dla gości moduł udostępnia też kalendarz typu pokoju (`GET /api/Availability/room-type/{id}?from=&to=`, bez logowania): liczbę wolnych pokoi w każdej nocy, bez danych o rezerwacjach. Wolny pokój w każdej nocy nie oznacza jeszcze, że jeden pokój jest wolny przez cały pobyt (gość musiałby zmieniać pokoje) – dlatego termin wybrany w kalendarzu jest na końcu sprawdzany tak samo jak w wyszukiwarce.

Ochrona przed równoczesną rezerwacją: utworzenie rezerwacji (`ReservationService`) i blokady (`RoomBlockService`) odbywa się w jednej transakcji bazy danych. Na jej początku moduł dostępności zakłada blokadę pesymistyczną na wiersze pokoi danego typu (`SELECT … WITH (UPDLOCK)`), trwającą do końca transakcji. Gdy dwóch gości rezerwuje w tej samej chwili ostatni wolny pokój, drugie żądanie czeka na zakończenie pierwszego, a potem sprawdza dostępność na aktualnych danych i dostaje komunikat, że pokój został przed chwilą zarezerwowany. Transakcja zapewnia też, że rezerwacja i kalendarz dostępności zapisują się razem albo wcale. Tak samo chronione są wpłaty: zapis płatności i zwrotów, anulowanie przez gościa i automatyczna zmiana statusu blokują wiersz rezerwacji (`ReservationService.LockReservationAsync`), więc dwie równoczesne wpłaty nie przekroczą ceny – druga liczy brakującą kwotę dopiero po zapisaniu pierwszej. W formularzu przycisk „Potwierdź rezerwację” jest blokowany na czas wysyłania, więc podwójne kliknięcie nie tworzy dwóch rezerwacji.

Cena pobytu (`ReservationService.CalculateTotalPriceAsync`): noclegi są liczone za pokój za noc (cena z cennika sezonowego albo cena bazowa typu pokoju), więc liczba gości nie zmienia ceny noclegu – tak jak w domyślnym modelu cen Booking.com. Liczba gości wpływa na usługi dodatkowe: każda usługa ma sposób naliczania (`ServiceChargeType`: raz za pobyt, za noc, za osobę, za osobę za noc), np. śniadanie dla 4 osób na 2 noce to 8 × cena śniadania. Rezerwacja zapisuje przy każdej usłudze liczbę naliczeń, sposób naliczania i cenę z chwili rezerwacji (tabela `ReservationServices`), więc późniejsza zmiana cennika usług nie zmienia ceny istniejących rezerwacji.

Przeniesienie gości (`AvailabilityService.RelocateReservationsAsync`): gdy pokój przechodzi w remont, zostaje wyłączony, zmienia typ albo dostaje blokadę, jego przyszłe rezerwacje (oczekujące i potwierdzone) trafiają do innych pokoi tego samego typu, wolnych przez cały pobyt danej rezerwacji. Dzieje się to w jednej transakcji z blokadą pokoi danego typu: jeśli choć jednej rezerwacji nie da się przenieść, cała zmiana jest odrzucana z listą takich rezerwacji, a pokój pozostaje bez zmian. Gość, który już mieszka w pokoju, nie jest przenoszony automatycznie – zmiana jest możliwa po jego wymeldowaniu. API zwraca listę przeniesień, a panel pokazuje ją w komunikacie.

Powiadomienia (`NotificationService`, tabela `Notifications`): zmiana w rezerwacji zapisuje powiadomienie dla drugiej strony – gość dowiaduje się o zmianie statusu przez hotel, zaksięgowaniu wpłaty i przeniesieniu do innego pokoju, a właściciel o nowej rezerwacji i anulowaniu przez gościa. Przy tworzeniu rezerwacji, płatności, anulowaniu i przeniesieniu powiadomienie zapisuje się w tej samej transakcji co sama zmiana. Dzwonek w pasku nawigacji pobiera listę (`GET /api/Notification`, 30 najnowszych) przy przejściu na inną stronę i co minutę; kliknięcie oznacza powiadomienie jako przeczytane (`PUT /api/Notification/{id}/read`) i otwiera szczegóły rezerwacji (`#/moje-rezerwacje/12` dla gościa, `#/panel/rezerwacje/12` dla właściciela).

Rejestrację i logowanie obsługuje `AuthService` (konta przez ASP.NET Core Identity). Serwis zna tylko interfejs `ITokenService` – samo wystawienie tokenu JWT (`JwtTokenService`, `API/Identity`) należy do warstwy API, bo format tokenu to szczegół komunikacji HTTP, a nie logika biznesowa (odwrócenie zależności).

Statusy i role zapisywane w bazie jako tekst są zdefiniowane w jednym miejscu, w klasach stałych w `Services/Constants` (`ReservationStatus`, `RoomStatus`, `AvailabilityStatus`, `PaymentStatus`, `PaymentMethod`, `UserRoles`, `AccountTypes`), np. `ReservationStatus.Cancelled` zamiast napisu `"cancelled"`. Należą do warstwy logiki biznesowej, bo to serwisy decydują, które statusy są dozwolone i jakie przejścia między nimi są możliwe. `Program.cs` zawiera tylko kolejność konfiguracji – szczegóły rejestracji usług są w `API/Extensions/ServiceCollectionExtensions.cs`, a dane startowe w `API/Data/DbSeeder.cs` (uruchamiane przy starcie API, które widzi wszystkie warstwy).

Automatyczne statusy rezerwacji (`ReservationService.UpdateExpiredReservationsAsync`): zadanie w tle `API/BackgroundJobs/ReservationStatusJob.cs` (`BackgroundService`) uruchamia je przy starcie API i potem co godzinę, więc zmiana daty o północy jest uwzględniana najpóźniej godzinę później. Potwierdzona rezerwacja po dniu wymeldowania staje się zakończona (gość może wystawić opinię, hotel – fakturę). Rezerwacja oczekująca, która do końca dnia terminu płatności (`Reservations.PaymentDeadline`) nie została opłacona w całości, zostaje anulowana, a jej noce wracają do puli wolnych pokoi; obie strony dostają powiadomienie. Zadanie tworzy własny zakres usług (`IServiceScopeFactory`) na każdy przebieg, bo serwisy i `DbContext` żyją w zakresie jednego żądania; błąd jednego przebiegu (np. chwilowy brak połączenia z bazą) jest zapisywany w logu i nie zatrzymuje zadania. Anulowanej rezerwacji nie da się przywrócić ręcznie – jej termin mógł zostać już zajęty.

Płatności i potwierdzanie rezerwacji: nowa rezerwacja ma status „oczekująca” i termin płatności `ReservationService.PaymentDeadlineFor` – 3 dni od złożenia, ale najpóźniej dzień przed przyjazdem (przy rezerwacji na dziś lub jutro – do końca dzisiejszego dnia). Gość widzi termin i brakującą kwotę w szczegółach rezerwacji i w powiadomieniu. Gość płaci przelewem (tytuł „Rezerwacja #numer”) albo w recepcji hotelu – gotówką, kartą lub BLIK-iem; system nie łączy się z operatorem płatności, a wpłatę zapisuje właściciel w szczegółach rezerwacji. Gdy wpłaty zarejestrowane przez właściciela osiągną łączną wartość całej ceny (`RegisterPaymentAsync`, liczą się tylko płatności zaksięgowane), rezerwacja automatycznie staje się „potwierdzona”. Gość, który nie przyjechał na opłaconą rezerwację, jest obsługiwany ręcznie – właściciel anuluje rezerwację przed dniem wymeldowania (inaczej zadanie w tle oznaczy ją jako zakończoną).

Polityka anulowania (`Services/Validation/CancellationPolicy.cs`): gość może anulować rezerwację najpóźniej dzień przed przyjazdem – bezpłatnie do 7 dni przed przyjazdem, później hotel zatrzymuje 30% ceny pobytu z wpłaconej kwoty (nie więcej, niż gość wpłacił; kwota zapisana w `Reservations.CancellationFee`), a resztę zwraca. Gość widzi warunki i dokładne kwoty przed anulowaniem, a po anulowaniu gość i właściciel dostają powiadomienie z kwotą do zwrotu. Rezerwacja anulowana przez hotel albo automatycznie (brak wpłaty w terminie) jest zwracana w całości. Zwrot rejestruje właściciel w szczegółach rezerwacji – formularz podpowiada kwotę do zwrotu i nie pozwala zwrócić więcej.

Rozliczenie rezerwacji to saldo: zaksięgowane wpłaty minus zwroty. Wpłata nie może przekroczyć brakującej kwoty, a zwrot – wpłaconej; do anulowanej rezerwacji można zarejestrować tylko zwrot. Usługi dodatkowej, która była już zamawiana, nie można usunąć (jest częścią historii rozliczeń i faktur – blokuje to także klucz obcy w bazie z `ON DELETE NO ACTION`); zamiast tego właściciel wycofuje ją z oferty (`AdditionalService.IsActive`) – gość nie widzi jej w formularzu, a API odrzuca jej zamówienie. Rezerwację składa tylko konto gościa (`[Authorize(Roles = Guest)]`).

Zdjęcia pokoi są zmniejszane jeszcze w przeglądarce (`utils/resizeImage.js`): dłuższy bok do 1600 px, ponowny zapis przez `<canvas>` z uwzględnieniem orientacji z aparatu – taki plik nie zawiera metadanych EXIF (np. lokalizacji GPS z telefonu), a przez sieć idzie kilkaset KB zamiast kilku MB. API (`FileStorageService`) sprawdza rozszerzenie, rozmiar i sygnaturę pliku (pierwsze bajty JPG / PNG / WEBP) – plik o innej zawartości, np. program z rozszerzeniem `.jpg`, jest odrzucany. Projekt celowo nie używa zewnętrznej biblioteki graficznej (ImageSharp ma od października 2026 znane luki w wersjach 3.1.x, a wersje z poprawkami wymagają klucza licencyjnego przy kompilacji). Kopie zdjęć startowych w `uploads` nie są w repozytorium – seeder odtwarza je przy starcie.

Faktury (`ReservationService.IssueInvoiceAsync`) są numerowane kolejno w serii miesiąca: `FV/rrrr/mm/nnnnn` (np. `FV/2026/11/00001`, `FV/2026/11/00002`), niezależnie od numerów rezerwacji – zgodnie z wymogiem kolejnej numeracji faktur. Numer jest liczony w transakcji z blokadą `UPDLOCK, HOLDLOCK` na fakturach danej serii, więc dwie faktury wystawiane w tej samej chwili nie dostaną tego samego numeru; unikalny indeks na `Invoices.InvoiceNumber` jest dodatkowym zabezpieczeniem. Miesiąc serii jest liczony według czasu lokalnego.

Termin pobytu sprawdza jedna reguła `Services/Validation/StayRules.cs`: przyjazd nie w przeszłości i przed wyjazdem, maksymalnie 60 nocy. Używają jej wszystkie endpointy rezerwacji (`availability`, `alternatives`, `search`, `price`, `create`) i serwis rezerwacji (tworzenie), więc w każdym miejscu obowiązuje ten sam limit i ten sam komunikat.

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
- Przy uruchomieniu aplikacja dodaje dane startowe (`API/Data/DbSeeder.cs`): role, konto właściciela, 7 typów pokoi (od pokoju jednoosobowego po apartament z jacuzzi, z powierzchnią w m²) z 19 pokojami i ich udogodnieniami, cennik sezonowy, 12 usług dodatkowych (z różnymi sposobami naliczania) oraz przykładowe zdjęcia typów pokoi z `API/Data/SeedPhotos`. Każda pozycja jest dodawana tylko wtedy, gdy jej jeszcze nie ma w bazie (po nazwie lub numerze pokoju), więc nowe dane startowe pojawiają się też w bazie utworzonej wcześniej, a istniejące dane nie są zmieniane. Zdjęcia są przypinane do typów pokoi, które nie mają jeszcze żadnego zdjęcia – na każdym komputerze (także na świeżej bazie) pokoje od razu mają zdjęcia.
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

## Pierwsze uruchomienie – przewodnik dla nowego użytkownika

Ta część prowadzi krok po kroku od pustego komputera do przetestowania najważniejszych funkcji: wyszukiwania, rezerwacji, modułu dostępności i panelu właściciela.

### Krok 1. Uruchom API i aplikację

1. Zainstaluj narzędzia z sekcji [Wymagania](#wymagania).
2. W katalogu `Backend/API` ustaw klucz JWT i utwórz bazę (tylko za pierwszym razem):
   ```
   dotnet user-secrets set "Jwt:Key" "dowolny-losowy-ciag-co-najmniej-32-znaki"
   dotnet ef database update --project ../DAL
   ```
3. Uruchom API: `dotnet run` (w katalogu `Backend/API`). Przy starcie seeder dodaje konto właściciela, 7 typów pokoi z 19 pokojami, zdjęcia, udogodnienia, cennik sezonowy i 12 usług dodatkowych. Sprawdzenie: `http://localhost:5285/swagger` otwiera dokumentację API.
4. W drugim oknie terminala, w katalogu `Frontend`:
   ```
   npm install
   npm run dev
   ```
   `npm install` wykonaj za pierwszym razem i po każdej zmianie `package.json` (np. po aktualizacji z repozytorium, która dodaje paczki – czcionki, biblioteki). Na Windows w PowerShellu, gdy `npm` jest blokowany przez zasady wykonywania skryptów, użyj `npm.cmd install` i `npm.cmd run dev`.
5. Otwórz `http://localhost:5173`. Powinna pojawić się strona główna ze zdjęciem hotelu, wyszukiwarką i 7 kafelkami pokoi.

**Gdy coś nie działa**

| Objaw | Przyczyna i rozwiązanie |
|-------|-------------------------|
| „Failed to fetch” albo brak pokoi na stronie głównej | API nie działa – uruchom `dotnet run` w `Backend/API`. Jeśli API działa na innym porcie, zmień `VITE_API_URL` w `Frontend/.env`. |
| Błąd CORS w konsoli przeglądarki | Aplikacja działa pod innym adresem niż `Frontend:BaseUrl` w `appsettings.json` (domyślnie `http://localhost:5173`). `npm run dev` i `npm run preview` używają tego samego portu – nie uruchamiaj obu naraz. |
| API nie startuje z komunikatem „Brak klucza JWT” | Nie ustawiono klucza – wykonaj `dotnet user-secrets set …` z kroku 2. |
| API wyłącza się przy starcie z błędem `Invalid column name '…'` (np. `Area`) | Baza jest starsza niż kod – po pobraniu nowej wersji wykonaj w `Backend`: `dotnet ef database update --project DAL --startup-project API`. |
| Chcesz zacząć od czystej bazy | W `Backend/API`: `dotnet ef database drop --project ../DAL`, potem `dotnet ef database update --project ../DAL` i `dotnet run`. |

### Krok 2. Przygotuj konta

Baza po pierwszym uruchomieniu nie ma gości ani rezerwacji – powstają w trakcie testów.

| Rola | Jak uzyskać | Do czego |
|------|-------------|----------|
| Właściciel | `admin@hotel.com` / `Admin123!` (z seedera) | panel właściciela |
| Gość 1 | „Zaloguj się” → zakładka „Rejestracja”, np. `anna@test.pl`, hasło `Test1234` (min. 8 znaków, w tym cyfra), telefon `+48 600 100 200` | rezerwacje, opinie |
| Gość 2 | druga rejestracja, np. `piotr@test.pl` / `Test1234` | sprawdzenie, że zajęty pokój nie jest sprzedawany drugi raz |

Najwygodniej testować w dwóch oknach przeglądarki: gość w zwykłym oknie, właściciel w oknie prywatnym (sesja jest zapisywana w przeglądarce, więc jedno okno = jedno konto).

### Krok 3. Gdzie co jest

| Adres | Widok | Dla kogo |
|-------|-------|----------|
| `#/` | strona główna: wyszukiwarka, pokoje, po wyszukaniu – wyniki z filtrami | wszyscy |
| `#/pokoj/6` | strona typu pokoju: galeria, opis, kalendarz dostępności, opinie | wszyscy |
| `#/logowanie` | logowanie i rejestracja | niezalogowani |
| `#/rezerwacja/6` | formularz rezerwacji z usługami i podsumowaniem ceny | gość |
| `#/moje-rezerwacje` | lista rezerwacji i szczegóły wybranej | gość |
| `#/profil` | dane konta, opinie gościa | zalogowani |
| `#/panel/dostepnosc` | kalendarz dostępności (pokoje × noce) | właściciel |
| `#/panel/rezerwacje` | wszystkie rezerwacje, płatności, faktury | właściciel |
| `#/panel/pokoje`, `typy-pokoi`, `cennik`, `uslugi`, `blokady`, `opinie`… | zarządzanie ofertą i obsługa | właściciel |

### Krok 4. Scenariusze do przetestowania

Każdy scenariusz ma kroki i oczekiwany wynik. Daty podawaj względem dzisiejszej (np. „za 10 dni”). Pełna lista przypadków testowych z tabelą wyników jest w [Backend/Tests/README.md](Backend/Tests/README.md).

**A. Wyszukiwanie i strona pokoju (bez logowania)**
1. Na stronie głównej ustaw termin (domyślnie: jutro, 2 noce) i liczbę gości, kliknij „Sprawdź dostępność”.
   → Lista wyników z ceną całego pobytu i liczbą wolnych pokoi; pokoje za małe dla tylu gości są pominięte (komunikat nad listą).
2. Użyj filtrów z boku: „Cena rosnąco”, udogodnienie „Jacuzzi”, „Tylko wolne w tym terminie”. → Lista się zawęża, „Wyczyść filtry” przywraca wszystko.
3. Kliknij „Zdjęcia, opis i kalendarz” przy „Apartament Premium”. → Galeria, udogodnienia i kalendarz; pod każdą datą liczba wolnych pokoi.
4. W kalendarzu kliknij dzień przyjazdu, potem dzień wyjazdu. → W pudełku rezerwacji pojawia się termin, „Pokój wolny w tym terminie” i cena „Razem”.
5. Wpisz w pasku adresu `#/pokoj/999` albo `#/cos-tam`. → Strona „Nie znaleziono”.

**B. Rezerwacja pokoju (Gość 1)**
1. Zaloguj się jako Gość 1, na stronie Apartamentu Premium wybierz w kalendarzu termin za 10 dni (2 noce) i kliknij „Zarezerwuj ten termin”.
   → Formularz rezerwacji z wybranym pokojem i terminem; od razu „Pokój dostępny!” i podsumowanie ceny po prawej.
2. Zaznacz „Śniadanie” i „Parking”. → Cena przelicza się od razu: śniadanie 2 osoby × 2 noce × 50 zł = 200 zł, parking 2 × 30 zł = 60 zł.
3. Kliknij „Potwierdź rezerwację”. → Komunikat z terminem płatności; w „Moich rezerwacjach” rezerwacja „Oczekująca” z kwotą do zapłaty.
4. Zaloguj się w drugim oknie jako właściciel. → Dzwonek pokazuje 1 nowe powiadomienie o nowej rezerwacji; kliknięcie otwiera jej szczegóły.

**C. Moduł dostępności – pokój nie jest sprzedawany drugi raz (Gość 2)**
Apartament Premium ma tylko jeden pokój (201), więc po scenariuszu B jest zajęty w tym terminie.
1. Jako Gość 2 wyszukaj na stronie głównej ten sam termin. → Apartament Premium ma etykietę „Brak wolnych pokoi w tym terminie” i 3 najbliższe wolne terminy tej samej długości z ceną.
2. Kliknij jedną z propozycji. → Otwiera się strona pokoju z nowym terminem i statusem „Pokój wolny w tym terminie”.
3. W kalendarzu pokoju noce z rezerwacji Gościa 1 są oznaczone jako „zajęte” i nie da się ich wybrać.

**D. Płatność i potwierdzenie**
1. Jako Gość 1 otwórz rezerwację z B w „Moich rezerwacjach”. → Żółte pole „Do zapłaty … do …” z tytułem przelewu „Rezerwacja #…” i informacją o płatności w recepcji.
2. Jako właściciel: Panel → Rezerwacje. → Nad tabelą informacja „1 rezerwacja czeka na wpłatę” i przycisk „Pokaż oczekujące”.
3. Otwórz „Szczegóły” rezerwacji z B, w „Płatnościach” zarejestruj najpierw zaliczkę 300 zł. → Status nadal „Oczekująca”, „Do zapłaty” zmniejsza się o 300 zł.
4. Zarejestruj drugą wpłatę (kwota podpowiada się sama – brakująca część). → Status zmienia się automatycznie na „Potwierdzona”; Gość 1 dostaje powiadomienie, a żółte pole w jego szczegółach znika.
5. Zmień status rezerwacji z B listą w tabeli na „Zrealizowana”, otwórz szczegóły i kliknij „Wystaw fakturę”. → Faktura z numerem `FV/rrrr/mm/00001`.
6. Jako Gość 1 otwórz tę rezerwację w „Moich rezerwacjach” i dodaj opinię (ocena i komentarz). → Opinia widoczna na stronie pokoju, w profilu gościa i w panelu (Opinie).

**E. Anulowanie (Gość 1)**
1. Zarezerwuj „Pokój Standardowy” za 20 dni.
2. W szczegółach rezerwacji kliknij „Anuluj rezerwację”. → Okno potwierdzenia: anulowanie bezpłatne (ponad 7 dni do przyjazdu). Po anulowaniu noce wracają do puli wolnych (sprawdź w kalendarzu pokoju).
3. Zarezerwuj pokój za 3 dni, jako właściciel zarejestruj wpłatę całości, a potem anuluj rezerwację jako gość. → Okno pokazuje opłatę 30% ceny i kwotę zwrotu; właściciel widzi w szczegółach „Do zwrotu gościowi” i rejestruje zwrot (status płatności „Zwrot”).

**F. Kalendarz dostępności i przeniesienie gości (właściciel)**
1. Jako Gość 1 zarezerwuj „Pokój Standardowy” za 5 dni (system przydzieli wolny pokój, np. 101 – numer widać w szczegółach rezerwacji).
2. Panel → Dostępność. → Rezerwacja widoczna jako pasek w wierszu pokoju (kolor według statusu); liczby obłożenia nad siatką; kliknięcie paska otwiera szczegóły.
3. Panel → Blokady pokoi: zablokuj ten pokój na dni rezerwacji z powodem „Remont”. → Komunikat „Przeniesiono rezerwacje: #… z pokoju 101 do 102”; w kalendarzu blokada jako szare paski, a rezerwacja w wierszu pokoju 102; gość dostaje powiadomienie.
4. Zablokuj w tym samym terminie także drugi pokój tego typu. → Błąd z listą rezerwacji, których nie ma gdzie przenieść; blokada nie zostaje zapisana.
5. Panel → Pokoje: ustaw pokojowi status „W remoncie”. → Przyszłe rezerwacje są przenoszone tak samo jak przy blokadzie.

**G. Automatyczne statusy (zadanie w tle co godzinę)**
Nieopłacona rezerwacja jest anulowana po terminie płatności, a potwierdzona – zamieniana na zrealizowaną dzień po wymeldowaniu. Żeby nie czekać kilku dni, przesuń termin płatności w bazie (np. w SQL Server Object Explorer w Visual Studio):
```sql
UPDATE Reservations SET PaymentDeadline = DATEADD(day, -1, GETDATE()) WHERE ReservationId = 1;
```
Uruchom ponownie API (zadanie działa przy starcie i potem co godzinę). → Rezerwacja ma status „Anulowana”, gość i właściciel dostali powiadomienie, a noce są znów wolne.

**H. Bezpieczeństwo**
1. Wpisz 5 razy złe hasło dla jednego konta. → Konto jest zablokowane na 15 minut.
2. Jako gość wpisz w pasku adresu `#/panel`. → Panel się nie otwiera (strona główna); API odrzuca zapytania panelu (403).
3. Wyloguj się i otwórz `#/moje-rezerwacje`. → Formularz logowania; po zalogowaniu wracasz na tę samą stronę.

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
- dane gości poza panelem właściciela są ograniczone: pełna lista opinii z imieniem i nazwiskiem (`GET /api/Review`) jest tylko dla właściciela, a strona pokoju pokazuje autora opinii jako „Anna N.”
- daty i godziny (płatności, faktury, opinie, powiadomienia, rejestracja konta) zapisywane są w czasie lokalnym hotelu, tak jak daty pobytów i termin płatności – panel i gość widzą te same godziny
- klucz JWT poza repozytorium (User Secrets)
