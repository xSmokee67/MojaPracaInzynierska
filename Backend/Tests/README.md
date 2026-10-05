# Testy systemu rezerwacji hotelowej

Faza 7 planu realizacji: testy jednostkowe logiki serwisów oraz scenariusze testów manualnych.

## 1. Testy jednostkowe

### Uruchomienie

W katalogu `Backend`:

```
dotnet test
```

W Visual Studio: **Test → Test Explorer → Run All**. Testy mają polskie nazwy (`DisplayName`), więc w Test Explorerze od razu widać, co sprawdzają.

Testy nie potrzebują SQL Servera. Każdy test dostaje osobną, pustą bazę w pamięci (EF Core InMemory) z tymi samymi danymi co seed w `API/Data/DbSeeder.cs` (`TestData.cs`).

### Technologie

- **xUnit**: framework testowy (`[Fact]` dla pojedynczego przypadku, `[Theory]` + `[InlineData]` dla kilku wariantów danych)
- **EF Core InMemory**: baza danych w pamięci zamiast SQL Servera
- **AutoMapper**: ten sam profil `ReservationMappingProfile` co w aplikacji

### Zakres (86 przypadków testowych)

| Plik | Co jest testowane | Przypadki |
|------|-------------------|-----------|
| `ReservationServiceAvailabilityTests.cs` | Sprawdzanie dostępności pokoju (`GetAvailableRoomIdAsync`): nakładające się terminy, terminy stykające się, anulowane rezerwacje, blokady pokoi, status pokoju | 19 |
| `ReservationServicePriceTests.cs` | Wyliczanie ceny (`CalculateTotalPriceAsync`): cena bazowa, sezonowa, pobyt na przełomie sezonu, usługi dodatkowe | 9 |
| `ReservationServiceWorkflowTests.cs` | Tworzenie rezerwacji, zmiana statusu, anulowanie przez gościa, płatności, faktury | 29 |
| `AvailabilityServiceTests.cs` | Aktualizacja kalendarza dostępności (`Availability`) | 4 |
| `ReservationServiceSearchTests.cs` | Wyszukiwarka na stronie głównej: liczba wolnych pokoi każdego typu, cena całego pobytu (z cennikiem sezonowym), dopasowanie do liczby gości | 9 |
| `FileStorageServiceTests.cs` | Zapis zdjęć pokoi na dysku: dozwolone formaty, limit rozmiaru, unikalne nazwy, usuwanie, ochrona przed ścieżkami spoza katalogu | 16 |

Testy pokrywają całą logikę biznesową z warstwy `Services`. Kontrolery API są cienką warstwą (walidacja wejścia i wywołanie serwisu), więc sprawdzają je testy manualne poniżej.

## 2. Scenariusze testów manualnych

Dane startowe (seed w `API/Data/DbSeeder.cs`):

- **Konto właściciela:** `admin@hotel.com` / `Admin123!`
- **Pokoje:** Pokój Standardowy (200 zł/noc, pokoje 101 i 102), Apartament Premium (500 zł/noc, pokój 201)
- **Cennik sezonowy:** Pokój Standardowy 350 zł/noc od 01.06.2027 do 31.08.2027
- **Usługi:** Śniadanie 50 zł, Parking 30 zł (doliczane raz do pobytu)

W kolumnie „Wynik” wpisz ✅ lub ❌ i opis błędu.

### Scenariusz A: pełna ścieżka gościa (rejestracja → rezerwacja → płatność → faktura → opinia)

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| A1 | Zarejestruj gościa z hasłem `abc` | Formularz nie wysyła się, komunikat o min. 8 znakach i cyfrze | |
| A2 | Zarejestruj gościa z poprawnymi danymi (np. `anna@test.pl` / `Haslo1234`) | „Rejestracja zakończona sukcesem! Możesz się teraz zalogować.” | |
| A3 | Zarejestruj drugi raz ten sam e-mail | Błąd „Użytkownik o podanym emailu już istnieje.” | |
| A4 | Zaloguj się jako gość | Strona główna, w prawym górnym rogu „Witaj, Anna” i przycisk „Mój profil” | |
| A5 | Zakładka „Zarezerwuj pobyt”: Pokój Standardowy, 10.03.2027 – 13.03.2027, zaznacz Śniadanie, „Sprawdź cenę i dostępność” | „Pokój dostępny!”, do zapłaty **650,00 PLN** (3 × 200 + 50) | |
| A6 | „Potwierdź i Rezerwuj” | Ekran „Udało się!” | |
| A7 | Zakładka „Moje rezerwacje” | Rezerwacja z pokojem 101, statusem „Oczekująca”, ceną 650 PLN | |
| A8 | Wyloguj, zaloguj jako właściciel, czerwony przycisk „Panel Właściciela” → zakładka „Rezerwacje” | Rezerwacja gościa na liście | |
| A9 | Zmień status na „Potwierdzona” | Komunikat sukcesu, nowy status na liście | |
| A10 | „Szczegóły” → zarejestruj płatność 300 zł kartą | Płatność na liście, „wpłacono 300,00 PLN” | |
| A11 | Zarejestruj drugą płatność (kwota podpowiada się jako 350 zł) | „wpłacono 650,00 PLN” | |
| A12 | Spróbuj wystawić fakturę | Przycisk nieaktywny: faktura dopiero po zrealizowaniu | |
| A13 | Zmień status na „Zrealizowana”, w szczegółach „Wystaw fakturę” | Faktura `FV/rrrr/mm/000nn` na 650 zł, przycisk znika | |
| A14 | Zaloguj jako gość, szczegóły rezerwacji | Widoczne płatności i faktura, formularz opinii | |
| A15 | Dodaj opinię 5★ z komentarzem | „Dziękujemy za wystawienie opinii!”, formularz zastąpiony opinią | |
| A16 | Zaloguj jako właściciel, „Panel Właściciela” → zakładka „Opinie” | Opinia gościa na liście, „Usuń” działa po potwierdzeniu | |

### Scenariusz B: ceny sezonowe

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| B1 | Pokój Standardowy, 10.07.2027 – 13.07.2027 | 1050 PLN (3 × 350) | |
| B2 | Pokój Standardowy, 30.08.2027 – 02.09.2027 | 900 PLN (350 + 350 + 200, 31.08 to jeszcze sezon) | |
| B3 | Apartament Premium, 10.07.2027 – 12.07.2027 | 1000 PLN (cennik sezonowy dotyczy tylko pokoju standardowego) | |

### Scenariusz C: dostępność i przypadki brzegowe

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| C1 | Gość 1 rezerwuje Apartament Premium 01.04.2027 – 05.04.2027 | Rezerwacja utworzona (pokój 201) | |
| C2 | Gość 2 sprawdza Apartament Premium 03.04.2027 – 07.04.2027 | „Brak wolnych pokoi w wybranym terminie.” | |
| C3 | Gość 2 sprawdza Apartament Premium 05.04.2027 – 07.04.2027 | Pokój dostępny (zameldowanie w dniu wymeldowania gościa 1) | |
| C4 | Data wymeldowania wcześniejsza niż zameldowania | Komunikat o nieprawidłowym terminie | |
| C5 | Gość anuluje przyszłą rezerwację z C1 (szczegóły → „Anuluj rezerwację”) | Status „Anulowana”, termin z C2 staje się dostępny | |
| C6 | Właściciel blokuje pokój 201 (zakładka „Blokady”) 10.05.2027 – 15.05.2027, powód „remont” | Blokada na liście | |
| C7 | Gość sprawdza Apartament Premium 12.05.2027 – 14.05.2027 | Brak wolnych pokoi | |
| C8 | Właściciel blokuje pokój w terminie z aktywną rezerwacją | Błąd „W tym terminie pokój ma aktywne rezerwacje…” | |
| C9 | Właściciel dodaje wpis cennika nachodzący na sezon 01.06–31.08.2027 | Błąd „Okres nakłada się na istniejący wpis cennika…” | |
| C10 | Właściciel zmienia status anulowanej rezerwacji na „Potwierdzona” | Lista statusów nieaktywna (anulowanej rezerwacji nie da się przywrócić) | |

### Scenariusz D: bezpieczeństwo i sesja

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| D1 | Logowanie złym hasłem | „Nieprawidłowy email lub hasło.” | |
| D2 | Wywołanie `GET /api/Reservation/all` bez tokenu (Swagger lub `API.http`) | 401 Unauthorized | |
| D3 | Wywołanie `GET /api/Reservation/all` z tokenem gościa | 403 Forbidden (tylko rola Owner) | |
| D4 | W przeglądarce: F12 → Application → Local Storage → ustaw `token_expiration` na datę z przeszłości, odśwież stronę | Wylogowanie z komunikatem „Sesja wygasła. Zaloguj się ponownie.” | |
| D5 | Gość otwiera szczegóły cudzej rezerwacji (`GET /api/Reservation/{id}` z jego tokenem) | 403 Forbidden | |

### Scenariusz E: strona główna, wyszukiwarka, profil pokoju i zdjęcia

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| E1 | Właściciel → „Panel Właściciela” → „Typy Pokoi” → „Edytuj” przy typie pokoju, uzupełnij opis, zapisz | Komunikat sukcesu, opis widoczny na stronie pokoju | |
| E2 | „Zdjęcia” → „Dodaj zdjęcia”, wybierz 3 pliki JPG/PNG | Miniatury w oknie, pierwsze oznaczone jako „Główne”, w tabeli liczba zdjęć 3 | |
| E3 | Dodaj plik GIF albo większy niż 5 MB | Komunikat o nieobsługiwanym formacie / za dużym pliku, nic nie zostaje zapisane | |
| E4 | „Ustaw jako główne” przy drugim zdjęciu | To zdjęcie wyświetla się na kafelku na stronie głównej | |
| E5 | „Usuń” przy zdjęciu (po potwierdzeniu) | Zdjęcie znika z listy i z folderu `Backend/API/uploads/room-types` | |
| E6 | Wyloguj się, otwórz stronę główną | Sekcja powitalna z wyszukiwarką; kafelki ze zdjęciem, średnią oceną (lub „Brak opinii”), do 3 udogodnień i ceną za noc | |
| E7 | Wybierz daty i liczbę gości, „Szukaj pokoi” | Nagłówek „Dostępne pokoje: N” z terminem; ceny za cały pobyt („1050 PLN za 3 noce”); etykiety „Dostępny” / „Ostatni wolny pokój!” / „Brak wolnych pokoi”; pokoje za małe dla tylu gości ukryte | |
| E8 | Kliknij dostępny pokój z wyników | Adres `#/pokoj/{id}`, galeria, opis, udogodnienia, opinie (imię i inicjał) oraz ramka „Twój termin” z ceną pobytu | |
| E9 | „Zarezerwuj ten termin” bez logowania | Formularz logowania z komunikatem „Zaloguj się lub załóż konto, aby zarezerwować pokój.” | |
| E10 | Zaloguj się jako gość | Od razu formularz rezerwacji z typem pokoju i datami z wyszukiwarki | |
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
| F4 | „Mój profil” → „Edytuj dane”, zmień imię na „Janusz”, „Zapisz Zmiany” | „Dane profilu zostały zapisane.”, w pasku od razu „Witaj, Janusz” (także po odświeżeniu strony) | |
| F5 | Zmiana hasła: różne hasła w polach „Nowe hasło” i „Powtórz nowe hasło” | „Nowe hasła nie są takie same.” | |
| F6 | Zmiana hasła ze złym obecnym hasłem | „Obecne hasło jest nieprawidłowe.” | |
| F7 | Zmiana hasła z poprawnym obecnym hasłem, wyloguj i zaloguj nowym hasłem | „Hasło zostało zmienione.”, logowanie nowym hasłem działa, starym nie | |
| F8 | Zaloguj jako gość, „Mój profil” | Dane z telefonem i numerem dokumentu („nie podano”), lista „Moje opinie” | |
| F9 | „Edytuj dane”: telefon `12` | Formularz się nie wysyła (walidacja numeru telefonu) | |
| F10 | Telefon `+48 600 100 300`, numer dokumentu `ABC123456`, zapisz | Nowe dane widoczne w profilu | |
| F11 | Gość wpisuje w adresie `#/panel` | Strona główna (panel tylko dla właściciela; API i tak zwraca 403) | |

### Scenariusz G: reset hasła

Bez skonfigurowanego serwera SMTP e-maile zapisują się jako pliki `.eml` w katalogu `Backend/API/Emails` (otwierają się w Outlooku / Thunderbirdzie albo w Notatniku).

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| G1 | Logowanie → „Nie pamiętasz hasła?”, adres nieistniejącego konta | Komunikat „Jeśli konto o podanym adresie istnieje, wysłaliśmy…”, w `Emails` nie pojawia się nowy plik | |
| G2 | To samo dla `anna@test.pl` | Ten sam komunikat, w `Emails` nowy plik z wiadomością „Reset hasła - Hotel Resort” i przyciskiem „Ustaw nowe hasło” | |
| G3 | Otwórz link z wiadomości | Strona „Ustaw nowe hasło” z adresem konta | |
| G4 | Różne hasła w obu polach | „Hasła nie są takie same.” | |
| G5 | Nowe hasło `Odzyskane1` w obu polach | „Hasło zostało zmienione. Możesz się teraz zalogować.” | |
| G6 | Otwórz ten sam link drugi raz i ustaw hasło | „Link do resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy link.” (link jest jednorazowy) | |
| G7 | Zablokuj konto 5 błędnymi hasłami (D1), potem zresetuj hasło | Po resecie logowanie nowym hasłem działa od razu (blokada zdjęta) | |

### Scenariusz H: sortowanie i filtry na stronie głównej, stopka, strona 404

| # | Krok | Oczekiwany wynik | Wynik |
|---|------|------------------|-------|
| H1 | Strona główna, „Sortuj: Cena: od najniższej”, potem „od najwyższej” | Kafelki ułożone według ceny za noc | |
| H2 | „Sortuj: Ocena gości” | Najwyżej oceniane na początku, pokoje bez opinii na końcu | |
| H3 | Zaznacz udogodnienie (np. „Klimatyzacja”), potem drugie | Widoczne tylko pokoje mające wszystkie zaznaczone udogodnienia, „Wyświetlono X z Y” | |
| H4 | Otwórz profil pokoju i wróć przyciskiem „Wstecz” | Sortowanie i zaznaczone udogodnienia zostają | |
| H5 | Wyszukaj termin, zaznacz „Tylko dostępne” | Znikają pokoje z etykietą „Brak wolnych pokoi”; przy każdym sortowaniu dostępne pokoje są przed niedostępnymi | |
| H6 | Filtry, przy których nic nie pasuje | „Żaden pokój nie spełnia wybranych filtrów.” z przyciskiem „Wyczyść filtry” | |
| H7 | Stopka na dowolnej stronie | Adres, telefon, e-mail, godziny zameldowania; skróty zależne od roli (gość: „Moje rezerwacje”, właściciel: „Panel Właściciela”) | |
| H8 | Adres `#/cokolwiek` oraz `#/pokoj/999` | Strona 404 z przyciskiem „Wróć na stronę główną” | |