using System.Collections.Generic;

namespace Model;

public class Guest : User
{
    public string FirstName {get; set; } = string.Empty;
    public string LastName {get; set; } = string.Empty;
    public string PhoneNumber {get; set; } = string.Empty;
    public string DocumentNumber {get; set; } = string.Empty;

    public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();
}