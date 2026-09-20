using System;

namespace Model;

public abstract class User
{
    public int UserId { get; set; }
    public string Email {get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; }

}