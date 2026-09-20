using System;
using Microsoft.AspNetCore.Identity;

namespace Model;

public abstract class User : IdentityUser<int>
{

    public string AccountType { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; }

}