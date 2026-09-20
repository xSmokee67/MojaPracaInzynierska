using System;

namespace Model;

public class RoomBlock
{
    public int RoomBlockId {get; set; }
    public int RoomId {get; set;}
    public int OwnerId {get; set;}
    public DateTime StartDate {get; set;}
    public DateTime EndDate {get; set; }
    public string Reason {get; set; } = string.Empty;

    public virtual Room Room { get; set; } = null!;
    public virtual Owner Owner { get; set; } = null!;
}