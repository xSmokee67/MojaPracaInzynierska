using System.Collections.Generic;

namespace Model;

public class AdditionalService
{
    public int ServiceId {get; set; }
    public string Name {get; set; } = string.Empty;
    public decimal Price {get; set; }
    // Sposób naliczania: raz za pobyt, za noc, za osobę albo za osobę za noc (stałe w Services/Constants/ServiceChargeType)
    public string ChargeType {get; set; } = string.Empty;

    public virtual ICollection<ReservationService> ReservationServices { get; set; } = new List<ReservationService>();

}