using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class InvoiceSequentialNumbering : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SequenceNumber",
                table: "Invoices",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Istniejące faktury (numerowane wcześniej według ID rezerwacji) dostają kolejne numery w serii swojego miesiąca
            migrationBuilder.Sql(@"
WITH Numbered AS (
    SELECT InvoiceId, IssueDate,
           ROW_NUMBER() OVER (PARTITION BY YEAR(IssueDate), MONTH(IssueDate) ORDER BY IssueDate, InvoiceId) AS Seq
    FROM Invoices
)
UPDATE i
SET SequenceNumber = n.Seq,
    InvoiceNumber = CONCAT('FV/', YEAR(n.IssueDate), '/', RIGHT('0' + CAST(MONTH(n.IssueDate) AS varchar(2)), 2), '/', RIGHT('00000' + CAST(n.Seq AS varchar(5)), 5))
FROM Invoices i
JOIN Numbered n ON n.InvoiceId = i.InvoiceId;");

            migrationBuilder.AlterColumn<string>(
                name: "InvoiceNumber",
                table: "Invoices",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_InvoiceNumber",
                table: "Invoices",
                column: "InvoiceNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Invoices_InvoiceNumber",
                table: "Invoices");

            migrationBuilder.AlterColumn<string>(
                name: "InvoiceNumber",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30);

            migrationBuilder.DropColumn(
                name: "SequenceNumber",
                table: "Invoices");
        }
    }
}
