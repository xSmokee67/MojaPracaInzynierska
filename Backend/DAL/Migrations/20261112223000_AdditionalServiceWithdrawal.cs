using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AdditionalServiceWithdrawal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Usługa może zostać wycofana z oferty zamiast usunięta - istniejące usługi są dostępne
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AdditionalServices",
                type: "bit",
                nullable: false,
                defaultValue: true);

            // Usunięcie usługi nie kasuje już jej pozycji w rezerwacjach (historia rozliczeń i faktur) - baza je blokuje
            migrationBuilder.DropForeignKey(
                name: "FK_ReservationServices_AdditionalServices_ServiceId",
                table: "ReservationServices");

            migrationBuilder.AddForeignKey(
                name: "FK_ReservationServices_AdditionalServices_ServiceId",
                table: "ReservationServices",
                column: "ServiceId",
                principalTable: "AdditionalServices",
                principalColumn: "ServiceId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReservationServices_AdditionalServices_ServiceId",
                table: "ReservationServices");

            migrationBuilder.AddForeignKey(
                name: "FK_ReservationServices_AdditionalServices_ServiceId",
                table: "ReservationServices",
                column: "ServiceId",
                principalTable: "AdditionalServices",
                principalColumn: "ServiceId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AdditionalServices");
        }
    }
}
