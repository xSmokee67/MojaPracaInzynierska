namespace Services.Constants;

// Role ASP.NET Core Identity - używane w [Authorize(Roles = ...)] i w tokenie JWT
public static class UserRoles
{
    public const string Owner = "Owner";
    public const string Guest = "Guest";

    public static readonly string[] All = { Owner, Guest };
}