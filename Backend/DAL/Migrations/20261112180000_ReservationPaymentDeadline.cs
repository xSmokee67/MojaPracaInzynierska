using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class ReservationPaymentDeadline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentDeadline",
                table: "Reservations",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // Istniejące rezerwacje: termin płatności dzień przed przyjazdem (najłagodniejszy wariant reguły)
            migrationBuilder.Sql("UPDATE Reservations SET PaymentDeadline = DATEADD(day, -1, CAST(CheckInDate AS date))");

            // Status "niestawienie się" został usunięty - takie rezerwacje (już zwolnione z kalendarza) stają się anulowane
            migrationBuilder.Sql("UPDATE Reservations SET Status = 'cancelled' WHERE Status = 'no-show'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentDeadline",
                table: "Reservations");
        }
    }
}
