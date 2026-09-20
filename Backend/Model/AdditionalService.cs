using System.Collections.Generic;

namespace Model;

public class AdditionalService
{
    public int ServiceId {get; set; }
    public string Name {get; set; } = string.Empty;
    public decimal Price {get; set; }

    public virtual ICollection<ReservationService> ReservationServices { get; set; } = new List<ReservationService>();

}