using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class RoomTypeArea : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Area",
                table: "RoomTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Typy pokoi z danych startowych dostają powierzchnię (inne typy właściciel uzupełni w panelu)
            migrationBuilder.Sql("UPDATE RoomTypes SET Area = 22 WHERE Name = N'Pokój Standardowy'");
            migrationBuilder.Sql("UPDATE RoomTypes SET Area = 48 WHERE Name = N'Apartament Premium'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Area",
                table: "RoomTypes");
        }
    }
}
