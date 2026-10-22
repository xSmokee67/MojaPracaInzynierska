using Services.DTO;

namespace Services.Interfaces;

public interface IAuthService
{
    Task RegisterAsync(RegisterDto dto);
    Task<LoginResultDto> LoginAsync(LoginDto dto);
}