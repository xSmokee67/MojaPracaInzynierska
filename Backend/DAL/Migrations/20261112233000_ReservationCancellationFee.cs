using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class ReservationCancellationFee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Opłata zatrzymana przez hotel przy późnym anulowaniu przez gościa - dotychczasowe anulowania były bezpłatne
            migrationBuilder.AddColumn<decimal>(
                name: "CancellationFee",
                table: "Reservations",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CancellationFee",
                table: "Reservations");
        }
    }
}
