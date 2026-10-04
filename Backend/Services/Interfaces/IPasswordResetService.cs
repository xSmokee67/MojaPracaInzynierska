using Services.DTO;

namespace Services.Interfaces;

public interface IPasswordResetService
{
    Task SendResetLinkAsync(string email);
    Task ResetPasswordAsync(ResetPasswordDto dto);
}