using System.Collections.Generic;
namespace Model;
public class Owner : User
{
    public string FirstName {get; set; } = string.Empty;
    public string LastName {get; set; } = string.Empty;

    public virtual ICollection<RoomBlock> CreatedRoomBlocks { get; set; } = new List<RoomBlock>();
}