using Model;

namespace Services.Interfaces;

// Wystawianie tokenu dla zalogowanego użytkownika - implementacja (JWT) jest w warstwie API,
// bo format tokenu to szczegół komunikacji HTTP, a nie logiki biznesowej
public interface ITokenService
{
    (string Token, DateTime Expiration) CreateToken(User user, IList<string> roles);
}