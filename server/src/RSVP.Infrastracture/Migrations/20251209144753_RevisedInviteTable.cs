using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RSVP.Infrastracture.Migrations
{
    /// <inheritdoc />
    public partial class RevisedInviteTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FamilyName",
                table: "Invites");

            migrationBuilder.RenameColumn(
                name: "InviteUrl",
                table: "Invites",
                newName: "InviteName");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Users",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "user",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true,
                oldDefaultValue: "user");

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "UserId", "CreatedDateTime", "ModifiedDateTime", "Password", "Role", "Username" },
                values: new object[] { new Guid("cfbc2309-be93-461e-d286-08de2dbc0fe5"), new DateTime(2025, 11, 28, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "AQAAAAIAAYagAAAAEM3FttS8yf1q9mZTsKc4hjfrb0j5fSOtZZ/vBM9HARp+8SjFS0HlNojuqmxE2hfR5Q==", "admin", "admin" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: new Guid("cfbc2309-be93-461e-d286-08de2dbc0fe5"));

            migrationBuilder.RenameColumn(
                name: "InviteName",
                table: "Invites",
                newName: "InviteUrl");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Users",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true,
                defaultValue: "user",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldDefaultValue: "user");

            migrationBuilder.AddColumn<string>(
                name: "FamilyName",
                table: "Invites",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }
    }
}
