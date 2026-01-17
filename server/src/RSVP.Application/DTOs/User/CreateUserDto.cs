using System.ComponentModel.DataAnnotations;

namespace RSVP.Application.DTOs.User
{
    public class CreateUserDto
    {
        [Required, MaxLength(50)]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
        public string? Role { get; set; }
    }
}
