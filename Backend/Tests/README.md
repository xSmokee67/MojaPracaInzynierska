# Testy systemu rezerwacji hotelowej

Faza 7 planu realizacji: testy jednostkowe logiki serwisów oraz scenariusze testów manualnych.

## 1. Testy jednostkowe

### Uruchomienie

W katalogu `Backend`:

```
dotnet test
```

W Visual Studio: **Test → Test Explorer → Run All**. Testy mają polskie nazwy (`DisplayName`), więc w Test Explorerze od razu widać, co sprawdzają.

Testy nie potrzebują SQL Servera. Każdy test dostaje osobną, pustą bazę w pamięci (EF Core InMemory) z tymi samymi danymi co seed w `Program.cs` (`TestData.cs`).

### Technologie

- **xUnit**: framework testowy (`[Fact]` dla pojedynczego przypadku, `[Theory]` + `[InlineData]` dla kilku wariantów danych)
- **EF Core InMemory**: baza danych w pamięci zamiast SQL Servera
- **AutoMapper**: ten sam profil `ReservationMappingProfile` co w aplikacji

### Zakres (61 przypadków testowych)

| Plik | Co jest testowane | Przypadki |
|------|-------------------|-----------|
| `ReservationServiceAvailabilityTests.cs` | Sprawdzanie dostępności pokoju (`GetAvailableRoomIdAsync`): nakładające się terminy, terminy stykające się, anulowane rezerwacje, blokady pokoi, status pokoju | 19 |
| `ReservationServicePriceTests.cs` | Wyliczanie ceny (`CalculateTotalPriceAsync`): cena bazowa, sezonowa, pobyt na przełomie sezonu, usługi dodatkowe | 9 |
| `ReservationServiceWorkflowTests.cs` | Tworzenie rezerwacji, zmiana statusu, anulowanie przez gościa, płatności, faktury | 29 |
| `AvailabilityServiceTests.cs` | Aktualizacja kalendarza dostępności (`Availability`) | 4 |

Testy pokrywają całą logikę biznesową z warstwy `Services`. Kontrolery API są cienką warstwą (walidacja wejścia i wywołanie serwisu), więc sprawdzają je testy manualne poniżej.

## 2. Scenariusze testów manualnych

Dane startowe (seed w `Program.cs`):

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
| A4 | Zaloguj się jako gość | Widok „Zarezerwuj pobyt”, w pasku e-mail gościa | |
| A5 | Pokój Standardowy, 10.03.2027 – 13.03.2027, zaznacz Śniadanie, „Sprawdź cenę i dostępność” | „Pokój dostępny!”, do zapłaty **650,00 PLN** (3 × 200 + 50) | |
| A6 | „Potwierdź i Rezerwuj” | Ekran „Udało się!” | |
| A7 | Zakładka „Moje rezerwacje” | Rezerwacja z pokojem 101, statusem „Oczekująca”, ceną 650 PLN | |
| A8 | Wyloguj, zaloguj jako właściciel, zakładka „Rezerwacje” | Rezerwacja gościa na liście | |
| A9 | Zmień status na „Potwierdzona” | Komunikat sukcesu, nowy status na liście | |
| A10 | „Szczegóły” → zarejestruj płatność 300 zł kartą | Płatność na liście, „wpłacono 300,00 PLN” | |
| A11 | Zarejestruj drugą płatność (kwota podpowiada się jako 350 zł) | „wpłacono 650,00 PLN” | |
| A12 | Spróbuj wystawić fakturę | Przycisk nieaktywny: faktura dopiero po zrealizowaniu | |
| A13 | Zmień status na „Zrealizowana”, w szczegółach „Wystaw fakturę” | Faktura `FV/rrrr/mm/000nn` na 650 zł, przycisk znika | |
| A14 | Zaloguj jako gość, szczegóły rezerwacji | Widoczne płatności i faktura, formularz opinii | |
| A15 | Dodaj opinię 5★ z komentarzem | „Dziękujemy za wystawienie opinii!”, formularz zastąpiony opinią | |
| A16 | Zaloguj jako właściciel, zakładka „Opinie” | Opinia gościa na liście, „Usuń” działa po potwierdzeniu | |

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