using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Discount.Grpc.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSamsungDiscount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remove Samsung discount coupon
            migrationBuilder.DeleteData(
                table: "Coupons",
                keyColumn: "Id",
                keyValue: 2);

            // Update LEGO Ferrari coupon ID from 3 to 2
            migrationBuilder.UpdateData(
                table: "Coupons",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Id" },
                values: new object[] { 2 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert LEGO Ferrari coupon ID back to 3
            migrationBuilder.UpdateData(
                table: "Coupons",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Id" },
                values: new object[] { 3 });

            // Add Samsung discount coupon back
            migrationBuilder.InsertData(
                table: "Coupons",
                columns: new[] { "Id", "Amount", "Description", "ProductName" },
                values: new object[] { 2, 100, "Samsung Discount", "Samsung 10" });
        }
    }
}
