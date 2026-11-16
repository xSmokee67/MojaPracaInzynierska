using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCleaningRoomStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Status pokoju "Sprzątanie" został usunięty z systemu - pokoje, które go miały, wracają do statusu "Dostępny"
            migrationBuilder.Sql("UPDATE Rooms SET Status = 'available' WHERE Status = 'cleaning'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nie da się odtworzyć, które pokoje były w trakcie sprzątania - schemat bazy się nie zmienia
        }
    }
}
