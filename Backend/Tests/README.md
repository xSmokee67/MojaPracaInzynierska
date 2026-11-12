# Testy systemu rezerwacji hotelowej

Faza 7 planu realizacji: testy jednostkowe logiki serwisów oraz scenariusze testów manualnych.

## 1. Testy jednostkowe

### Uruchomienie

W katalogu `Backend`:

```
dotnet test
```

W Visual Studio: **Test → Test Explorer → Run All**. Testy mają polskie nazwy (`DisplayName`), więc w Test Explorerze od razu widać, co sprawdzają.

Testy nie potrzebują SQL Servera. Każdy test dostaje osobną, pustą bazę w pamięci (EF Core InMemory) z małym, stałym zestawem danych (`TestData.cs`: 2 typy pokoi i 3 pokoje jak Pokój Standardowy i Apartament Premium z seeda, cennik sezonowy, śniadanie i parking) – niezależnym od rozbudowanych danych startowych w `API/Data/DbSeeder.cs`.

### Technologie

- **xUnit**: framework testowy (`[Fact]` dla pojedynczego przypadku, `[Theory]` + `[InlineData]` dla kilku wariantów danych)
- **EF Core InMemory**: baza danych w pamięci zamiast SQL Servera
- **AutoMapper**: ten sam profil `ReservationMappingProfile` co w aplikacji

### Zakres (130 przypadków testowych)

| Plik | Co jest testowane | Przypadki |
|------|-------------------|-----------|
| `ReservationServiceAvailabilityTests.cs` | Sprawdzanie dostępności pokoju w module dostępności (`AvailabilityService.GetAvailableRoomIdAsync`): nakładające się terminy, terminy stykające się, rezerwacje anulowane (zwalniają pokój), blokady pokoi, status pokoju | 18 |
| `ReservationServicePriceTests.cs` | Wyliczanie ceny (`CalculateTotalPriceAsync`): cena bazowa, sezonowa, pobyt na przełomie sezonu, usługi dodatkowe według sposobu naliczania (raz za pobyt, za noc, za osobę, za osobę za noc), liczba gości nie zmienia ceny noclegu | 14 |
| `ReservationServiceWorkflowTests.cs` | Tworzenie rezerwacji (w tym liczba gości względem pojemności pokoju i liczba naliczeń usług), zmiana terminu (przeliczenie usług naliczanych za noc), zmiana statusu, anulowanie przez gościa, płatności, faktury (kolejna numeracja w serii miesiąca) | 34 |
| `StayRulesTests.cs` | Wspólna reguła terminu pobytu (`StayRules`): przyjazd nie w przeszłości i przed wyjazdem, maks. 60 nocy – także przy tworzeniu rezerwacji i zmianie terminu | 10 |
| `CancellationPolicyTests.cs` | Polityka anulowania: bezpłatnie do 7 dni przed przyjazdem, później hotel zatrzymuje 30% ceny (nie więcej niż wpłacono), limit zwrotu po późnym anulowaniu, anulowanie przez hotel z pełnym zwrotem | 8 |
| `ReservationPaymentTests.cs` | Termin płatności (3 dni, najpóźniej dzień przed przyjazdem), automatyczne potwierdzenie po wpłacie całości, automatyczne anulowanie nieopłaconej rezerwacji po terminie, zakończenie pobytu po wymeldowaniu, saldo (wpłaty minus zwroty), limit wpłaty do brakującej kwoty i zwrotu do wpłaconej | 14 |
| `AdditionalServiceServiceTests.cs` | Usługi dodatkowe w panelu: zapis i walidacja sposobu naliczania, blokada usuwania usługi zamówionej w rezerwacjach, usługa wycofana z oferty nie do zamówienia | 5 |
| `ReservationServiceSearchTests.cs` | Wyszukiwarka na stronie głównej: liczba wolnych pokoi każdego typu, cena całego pobytu (z cennikiem sezonowym), dopasowanie do liczby gości | 9 |
| `FileStorageServiceTests.cs` | Zapis zdjęć pokoi na dysku: dozwolone formaty, limit rozmiaru, odrzucanie plików, które nie są obrazem (sygnatura pliku zgodna z rozszerzeniem), unikalne nazwy, usuwanie, ochrona przed ścieżkami spoza katalogu | 18 |

Testy pokrywają całą logikę biznesową z warstwy `Services`. Kontrolery API są cienką warstwą (walidacja wejścia i wywołanie serwisu), więc sprawdzają je testy manualne poniżej.

## 2. Scenariusze testów manualnych

Dane startowe (seed w `API/Data/DbSeeder.cs`):

- **Konto właściciela:** `admin@hotel.com` / `Admin123!`
- **Pokoje (typ – cena – maks. gości – powierzchnia – numery):**
  - Pokój Standardowy – 200 zł – 2 os. – 22 m² – 101, 102
  - Apartament Premium – 500 zł – 4 os. – 48 m² – 201 (jedyny pokój tego typu – na nim opierają się scenariusze C1–C7)
  - Pokój Jednoosobowy – 140 zł – 1 os. – 14 m² – 103, 104, 105
  - Pokój Twin – 210 zł – 2 os. – 20 m² – 106, 107, 108
  - Pokój Rodzinny – 360 zł – 5 os. – 34 m² – 301, 302, 303, 304
  - Studio z Aneksem Kuchennym – 300 zł – 3 os. – 30 m² – 305, 306, 307
  - Apartament z Jacuzzi – 750 zł – 2 os. – 55 m² – 401, 402, 403
- **Udogodnienia:** przypisane do pokoi według typu (np. aneks kuchenny w studiu, jacuzzi w apartamencie, łóżko małżeńskie / dwa pojedyncze łóżka); pokój 101 przystosowany dla osób z niepełnosprawnościami, wybrane pokoje z balkonem / widokiem na morze
- **Cennik sezonowy:** Pokój Standardowy 350 zł/noc od 01.06.2027 do 31.08.2027
- **Usługi:** Śniadanie 50 zł i Obiadokolacja 70 zł (za osobę za noc), Wypożyczenie roweru 35 zł (za osobę za noc), Parking 30 zł, Łóżeczko dla dziecka 25 zł, Pobyt ze zwierzęciem 40 zł, Ładowanie samochodu elektrycznego 40 zł (za noc), Wstęp do strefy SPA 45 zł (za osobę), Transfer z lotniska 120 zł, Wczesne zameldowanie 60 zł, Późne wymeldowanie 60 zł, Pakiet powitalny 90 zł (raz za pobyt)
- **Zdjęcia:** 3–5 przykładowych zdjęć dla każdego typu pokoju (`API/Data/SeedPhotos`) – dodawane do typu, który nie ma jeszcze żadnego zdjęcia
- Brakujące typy pokoi, pokoje, udogodnienia i usługi są dodawane przy każdym starcie API (po nazwie / numerze pokoju), także do bazy utworzonej wcześniej; istniejących danych seeder nie zmienia

W kolumnie „Wynik” wpisz ✅ lub ❌ i opis błędu.

### Scenariusz A: pełna ścieżka gościa (rejestracja → rezerwacja → płatność → faktura → opinia)

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| A1 | Zarejestruj gościa z hasłem `abc` | Formularz nie wysyła się, komunikat o min. 8 znakach i cyfrze | |
| A2 | Zarejestruj gościa z poprawnymi danymi (np. `anna@test.pl` / `Haslo1234`) | „Rejestracja zakończona sukcesem! Możesz się teraz zalogować.” | |
| A3 | Zarejestruj drugi raz ten sam e-mail | Błąd „Użytkownik o podanym emailu już istnieje.” | |
| A4 | Zaloguj się jako gość | Strona główna, w prawym górnym rogu „Witaj, Anna” i przycisk „Mój profil” | |
| A5 | Zakładka „Zarezerwuj pobyt”: liczba gości 1, Pokój Standardowy, 10.03.2027 – 13.03.2027, zaznacz Śniadanie, „Sprawdź cenę i dostępność” | „Pokój dostępny!”, w podsumowaniu „Śniadanie: 3 × 50 PLN (za osobę za noc) = 150.00 PLN”, do zapłaty **750,00 PLN** (3 × 200 + 1 os. × 3 noce × 50) | |
| A6 | „Potwierdź i Rezerwuj” | Ekran „Udało się!” z komunikatem „Opłać ją do …” (dziś + 3 dni) | |
| A7 | Zakładka „Moje rezerwacje” | Rezerwacja z pokojem 101, statusem „Oczekująca” z dopiskiem „opłać do …”, ceną 750 PLN; w szczegółach „Do zapłaty 750.00 PLN do …” | |
| A8 | Wyloguj, zaloguj jako właściciel, czerwony przycisk „Panel Właściciela” → zakładka „Rezerwacje” | Rezerwacja gościa na liście, pod statusem „wpłata do …” | |
| A9 | „Szczegóły” → zarejestruj płatność 300 zł kartą | Płatność na liście, „wpłacono 300.00 PLN”, status nadal „Oczekująca”, „Do zapłaty 450.00 PLN do …” | |
| A10 | Zarejestruj drugą płatność (kwota podpowiada się jako 450 zł) | „wpłacono 750.00 PLN”, status zmienia się automatycznie na „Potwierdzona” | |
| A11 | Zamknij szczegóły, lista rezerwacji | Status „Potwierdzona”, bez dopisku „wpłata do” | |
| A12 | Spróbuj wystawić fakturę | Przycisk nieaktywny: faktura dopiero po zrealizowaniu | |
| A13 | Zmień status na „Zrealizowana”, w szczegółach „Wystaw fakturę” | Faktura `FV/rrrr/mm/nnnnn` na 750 zł (kolejny numer w bieżącym miesiącu – pierwsza faktura w miesiącu to `00001`), przycisk znika | |
| A14 | Zaloguj jako gość, szczegóły rezerwacji | Widoczne płatności i faktura, formularz opinii | |
| A15 | Dodaj opinię 5★ z komentarzem | „Dziękujemy za wystawienie opinii!”, formularz zastąpiony opinią | |
| A16 | Zaloguj jako właściciel, „Panel Właściciela” → zakładka „Opinie” | Opinia gościa na liście, „Usuń” działa po potwierdzeniu | |

### Scenariusz B: ceny sezonowe

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| B1 | Pokój Standardowy, 10.07.2027 – 13.07.2027 | 1050 PLN (3 × 350) | |
| B2 | Pokój Standardowy, 30.08.2027 – 02.09.2027 | 900 PLN (350 + 350 + 200, 31.08 to jeszcze sezon) | |
| B3 | Apartament Premium, 10.07.2027 – 12.07.2027 | 1000 PLN (cennik sezonowy dotyczy tylko pokoju standardowego) | |
| B4 | Apartament Premium, 10.03.2027 – 12.03.2027, liczba gości 1, potem 4 (bez usług) | Za każdym razem 1000 PLN - cena za pokój, nie za osobę | |
| B5 | Jak B4 dla 4 gości, zaznacz Śniadanie i Parking | 1460 PLN (1000 + śniadanie 4 os. × 2 noce × 50 + parking 2 noce × 30); w podsumowaniu każda usługa rozpisana | |
| B6 | Właściciel → „Usługi Dodatkowe”: dodaj „Transfer z lotniska”, 120 zł, naliczanie „raz za pobyt” | Usługa na liście z kolumną „Naliczanie”; w formularzu rezerwacji „+120 PLN raz za pobyt” i doliczane 120 zł niezależnie od nocy i osób | |
| B7 | Rezerwacja z B5 → szczegóły → właściciel zmienia termin na 10.03.2027 – 13.03.2027 | Usługi przeliczone na 3 noce („Śniadanie × 12”, „Parking × 3”), cena 1500 + 600 + 90 = 2190 PLN | |

### Scenariusz C: dostępność i przypadki brzegowe

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| C1 | Gość 1 rezerwuje Apartament Premium 01.04.2027 – 05.04.2027 | Rezerwacja utworzona (pokój 201) | |
| C2 | Gość 2 sprawdza Apartament Premium 03.04.2027 – 07.04.2027 | „Brak wolnych pokoi w wybranym terminie.” | |
| C3 | Gość 2 sprawdza Apartament Premium 05.04.2027 – 07.04.2027 | Pokój dostępny (zameldowanie w dniu wymeldowania gościa 1) | |
| C4 | Data wymeldowania wcześniejsza niż zameldowania | Komunikat o nieprawidłowym terminie | |
| C5 | Gość anuluje przyszłą rezerwację z C1 (szczegóły → „Anuluj rezerwację”) | Przy przycisku warunki anulowania („Bezpłatne anulowanie do …”), w potwierdzeniu kwota zwrotu; po anulowaniu status „Anulowana”, termin z C2 staje się dostępny, gość i właściciel dostają powiadomienie z kwotą zwrotu | |
| C6 | Właściciel blokuje pokój 201 (zakładka „Blokady”) 10.05.2027 – 15.05.2027, powód „remont” | Blokada na liście | |
| C7 | Gość sprawdza Apartament Premium 12.05.2027 – 14.05.2027 | Brak wolnych pokoi | |
| C8 | Właściciel blokuje pokój w terminie z aktywną rezerwacją | Błąd „W tym terminie pokój ma aktywne rezerwacje…” | |
| C9 | Właściciel dodaje wpis cennika nachodzący na sezon 01.06–31.08.2027 | Błąd „Okres nakłada się na istniejący wpis cennika…” | |
| C10 | Właściciel zmienia status anulowanej rezerwacji na „Potwierdzona” | Lista statusów nieaktywna (takiej rezerwacji nie da się przywrócić - jej noce wróciły do puli wolnych) | |
| C11 | Formularz „Zarezerwuj pobyt”: liczba gości 3 | Pokój Standardowy (max 2 os.) nieaktywny na liście z dopiskiem „za mały”; gdy był wybrany - komunikat i nieaktywny przycisk „Sprawdź cenę i dostępność” | |
| C12 | `POST /api/Reservation/create` (Swagger, token gościa) dla Pokoju Standardowego z `numberOfGuests: 3` | 400 „Liczba gości musi wynosić od 1 do 2 - tyle osób mieści wybrany pokój.” | |
| C13 | Rezerwacja Apartamentu Premium dla 4 osób, potem szczegóły rezerwacji (gość) i zakładka „Rezerwacje” (właściciel) | Rezerwacja utworzona; liczba gości „4 osoby” widoczna w szczegółach i na liście w panelu | |
| C14 | Gość składa rezerwację i jej nie opłaca; w bazie (SSMS) ustaw tej rezerwacji `PaymentDeadline` na wczorajszą datę i uruchom ponownie API | Status „Anulowana”; gość i właściciel dostają powiadomienie o anulowaniu z powodu braku wpłaty; termin znów dostępny w wyszukiwarce | |
| C15 | Wystaw fakturę dla dwóch różnych zrealizowanych rezerwacji (np. #12, potem #5) | Numery `…/00001` i `…/00002` w kolejności wystawienia, niezależnie od numerów rezerwacji | |
| C16 | Swagger: `POST /api/Reservation/price` z wyjazdem przed przyjazdem, potem z pobytem 61 nocy | 400 „Nieprawidłowy termin pobytu…”, potem 400 „Pobyt może trwać maksymalnie 60 nocy.” (ta sama reguła w `create`, `search`, `availability`, `alternatives`) | |
| C17 | Właściciel → „Usługi Dodatkowe” → „Usuń” przy Śniadaniu zamówionym wcześniej w rezerwacji | Komunikat „Tej usługi nie można usunąć, bo była już zamawiana…”; usługa zostaje, rozliczenie starych rezerwacji bez zmian | |
| C18 | „Edytuj” przy tej usłudze, odznacz „Dostępna w ofercie”, zapisz; gość otwiera formularz rezerwacji | Na liście w panelu „wycofana”; gość nie widzi usługi w formularzu; stare rezerwacje nadal ją pokazują | |
| C19 | Szczegóły rezerwacji za 750 zł z wpłatą 750 zł → zarejestruj kolejną wpłatę 10 zł | Błąd „Rezerwacja jest już opłacona w całości.” | |
| C20 | Właściciel anuluje opłaconą rezerwację, potem w szczegółach formularz płatności | „Do zwrotu gościowi: … PLN”; formularz podpowiada zwrot całej wpłaty, jedyny status to „Zwrot”; zwrot większy niż wpłaty – błąd; po zwrocie „Rozliczone – nic więcej do zwrotu.”, a formularz znika | |
| C21 | Gość opłaca w całości rezerwację z przyjazdem za 3 dni i ją anuluje | Przed anulowaniem: „Anulowanie teraz: opłata 30% ceny, zwrot reszty”; po anulowaniu: „Opłata za anulowanie (zostaje w hotelu): …”, „Do zwrotu gościowi: …” (70% ceny) | |
| C22 | Właściciel próbuje zwrócić w C21 całą wpłatę | Błąd „Do zwrotu zostało … PLN - hotel zatrzymuje … PLN opłaty za anulowanie.”; zwrot 70% ceny przechodzi | |

### Scenariusz D: bezpieczeństwo i sesja

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| D1 | Logowanie złym hasłem | „Nieprawidłowy email lub hasło.” | |
| D2 | Wywołanie `GET /api/Reservation/all` bez tokenu (Swagger) | 401 Unauthorized | |
| D3 | Wywołanie `GET /api/Reservation/all` z tokenem gościa | 403 Forbidden (tylko rola Owner) | |
| D4 | W przeglądarce: F12 → Application → Local Storage → ustaw `token_expiration` na datę z przeszłości, odśwież stronę | Wylogowanie z komunikatem „Sesja wygasła. Zaloguj się ponownie.” | |
| D5 | Gość otwiera szczegóły cudzej rezerwacji (`GET /api/Reservation/{id}` z jego tokenem) | 403 Forbidden | |
| D6 | Swagger: `POST /api/Reservation/create` z tokenem właściciela | 403 Forbidden (rezerwację składa tylko gość) | |

### Scenariusz E: strona główna, wyszukiwarka, profil pokoju i zdjęcia

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| E1 | Właściciel → „Panel Właściciela” → „Typy Pokoi” → „Edytuj” przy typie pokoju, uzupełnij opis, zapisz | Komunikat sukcesu, opis widoczny na stronie pokoju | |
| E2 | „Zdjęcia” → „Dodaj zdjęcia”, wybierz 3 pliki JPG/PNG | Miniatury w oknie, pierwsze oznaczone jako „Główne”, w tabeli liczba zdjęć 3 | |
| E3 | Dodaj plik GIF albo większy niż 5 MB | Komunikat o nieobsługiwanym formacie / za dużym pliku, nic nie zostaje zapisane | |
| E3a | Swagger: `POST /api/RoomType/{id}/photos` z plikiem tekstowym albo programem przemianowanym na `.jpg` | 400 „Plik … nie jest prawidłowym obrazem JPG.”, nic nie zostaje zapisane | |
| E3b | W panelu dodaj zdjęcie z telefonu/aparatu (np. 4000 × 3000 px, nawet ponad 5 MB) | Zdjęcie przyjęte; w folderze `uploads/room-types` ma maks. 1600 px na dłuższym boku (kilkaset KB) i nie zawiera danych EXIF | |
| E4 | „Ustaw jako główne” przy drugim zdjęciu | To zdjęcie wyświetla się na kafelku na stronie głównej | |
| E5 | „Usuń” przy zdjęciu (po potwierdzeniu) | Zdjęcie znika z listy i z folderu `Backend/API/uploads/room-types` | |
| E6 | Wyloguj się, otwórz stronę główną | Sekcja powitalna z wyszukiwarką; kafelki ze zdjęciem, średnią oceną (lub „Brak opinii”), do 3 udogodnień i ceną za noc | |
| E7 | Wybierz daty i liczbę gości, „Szukaj pokoi” | Nagłówek „Dostępne pokoje: N” z terminem; ceny za cały pobyt („1050 PLN za 3 noce”); etykiety „Dostępny” / „Ostatni wolny pokój!” / „Brak wolnych pokoi”; pokoje za małe dla tylu gości ukryte | |
| E8 | Kliknij dostępny pokój z wyników | Adres `#/pokoj/{id}`, galeria, opis, udogodnienia, opinie (imię i inicjał) oraz ramka „Twój termin” z ceną pobytu | |
| E9 | „Zarezerwuj ten termin” bez logowania | Formularz logowania z komunikatem „Zaloguj się lub załóż konto, aby zarezerwować pokój.” | |
| E10 | Zaloguj się jako gość | Od razu formularz rezerwacji z typem pokoju, datami i liczbą gości z wyszukiwarki | |
| E11 | Przycisk „Wstecz” w przeglądarce, potem odśwież stronę główną | Powrót do profilu; wyniki wyszukiwania zostają po odświeżeniu | |
| E12 | „Pokaż wszystkie pokoje” | Pełna lista typów pokoi z ceną za noc | |

### Scenariusz F: widok właściciela i profil użytkownika

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| F1 | Zaloguj się jako właściciel | Strona główna jak dla gościa, w pasku czerwony przycisk „Panel Właściciela” i „Witaj, Jan” | |
| F2 | Otwórz profil dowolnego pokoju | Zamiast przycisku rezerwacji: „Podgląd jako właściciel - rezerwacji dokonują goście.” | |
| F3 | „Panel Właściciela” | Adres `#/panel`, zakładki panelu (typy pokoi, pokoje, cennik, rezerwacje…) | |
| F3a | Kliknij zakładkę „Udogodnienia”, odśwież stronę (F5), potem „Cennik Sezonowy” i przycisk „Wstecz” przeglądarki | Adres `#/panel/udogodnienia`, po odświeżeniu ta sama zakładka; „Wstecz” wraca z `#/panel/cennik` do Udogodnień | |
| F3b | „Rezerwacje” → „Szczegóły” przy rezerwacji | Adres `#/panel/rezerwacje/{id}`, w okruszkach „Rezerwacja #id”; po zamknięciu okna `#/panel/rezerwacje` | |
| F4 | Zaloguj jako gość, „Mój profil” | Dane konta (imię i nazwisko, e-mail, telefon, data założenia) i lista „Moje opinie” | |
| F5 | Gość wpisuje w adresie `#/panel` | Strona główna (panel tylko dla właściciela; API i tak zwraca 403) | |

### Scenariusz G: sortowanie i filtry na stronie głównej, stopka, strona 404

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| G1 | Strona główna, „Sortuj: Cena: od najniższej”, potem „od najwyższej” | Kafelki ułożone według ceny za noc | |
| G2 | „Sortuj: Ocena gości” | Najwyżej oceniane na początku, pokoje bez opinii na końcu | |
| G3 | Zaznacz udogodnienie (np. „Klimatyzacja”), potem drugie | Widoczne tylko pokoje mające wszystkie zaznaczone udogodnienia, „Wyświetlono X z Y” | |
| G4 | Otwórz profil pokoju i wróć przyciskiem „Wstecz” | Sortowanie i zaznaczone udogodnienia zostają | |
| G5 | Wyszukaj termin, zaznacz „Tylko dostępne” | Znikają pokoje z etykietą „Brak wolnych pokoi”; przy każdym sortowaniu dostępne pokoje są przed niedostępnymi | |
| G6 | Filtry, przy których nic nie pasuje | „Żaden pokój nie spełnia wybranych filtrów.” z przyciskiem „Wyczyść filtry” | |
| G7 | Stopka na dowolnej stronie | Adres, telefon, e-mail, godziny zameldowania; skróty zależne od roli (gość: „Moje rezerwacje”, właściciel: „Panel Właściciela”) | |
| G8 | Adres `#/cokolwiek` oraz `#/pokoj/999` | Strona 404 z przyciskiem „Wróć na stronę główną” | |