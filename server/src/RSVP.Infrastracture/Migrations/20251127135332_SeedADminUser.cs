using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RSVP.Infrastracture.Migrations
{
    /// <inheritdoc />
    public partial class SeedADminUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "UserId", "CreatedDateTime", "ModifiedDateTime", "Password", "Role", "Username" },
                values: new object[] { new Guid("ef9fd5ac-eedd-4f3a-bea2-aae7f46f7d30"), new DateTime(2025, 11, 27, 13, 53, 31, 833, DateTimeKind.Utc).AddTicks(9211), null, "AQAAAAIAAYagAAAAEM3FttS8yf1q9mZTsKc4hjfrb0j5fSOtZZ/vBM9HARp+8SjFS0HlNojuqmxE2hfR5Q==", "admin", "admin" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: new Guid("ef9fd5ac-eedd-4f3a-bea2-aae7f46f7d30"));
        }
    }
}
