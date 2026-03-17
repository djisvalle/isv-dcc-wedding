using System.ComponentModel.DataAnnotations;

namespace RSVP.Application.DTOs.Auth
{
    public record LoginDto
    {
        [Required, MaxLength(50)]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
    }
}
