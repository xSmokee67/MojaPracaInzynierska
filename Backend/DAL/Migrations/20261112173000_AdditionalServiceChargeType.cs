using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AdditionalServiceChargeType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Istniejące usługi i rezerwacje: naliczanie raz za pobyt - tak jak liczył system przed tą zmianą
            migrationBuilder.AddColumn<string>(
                name: "ChargeType",
                table: "AdditionalServices",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "per-stay");

            migrationBuilder.AddColumn<string>(
                name: "ChargeType",
                table: "ReservationServices",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "per-stay");

            // Usługi z danych startowych (DbSeeder) dostają ten sam sposób naliczania co w nowej bazie.
            // Zapisane już rezerwacje zostają bez zmian (raz za pobyt) - ich cena została ustalona przy rezerwacji.
            migrationBuilder.Sql("UPDATE AdditionalServices SET ChargeType = 'per-person-per-night' WHERE Name = N'Śniadanie'");
            migrationBuilder.Sql("UPDATE AdditionalServices SET ChargeType = 'per-night' WHERE Name = N'Parking'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChargeType",
                table: "AdditionalServices");

            migrationBuilder.DropColumn(
                name: "ChargeType",
                table: "ReservationServices");
        }
    }
}
