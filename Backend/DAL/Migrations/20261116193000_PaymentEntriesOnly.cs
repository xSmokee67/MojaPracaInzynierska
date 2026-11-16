using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class PaymentEntriesOnly : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Płatność jest teraz tylko wpłatą albo zwrotem - wpisy "oczekująca" i "nieudana" nigdy nie liczyły się do salda rezerwacji,
            // więc są usuwane (rozliczenie rezerwacji się nie zmienia)
            migrationBuilder.Sql("DELETE FROM Payments WHERE Status IN ('pending', 'failed')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Usuniętych wpisów nie da się odtworzyć - schemat bazy się nie zmienia
        }
    }
}
