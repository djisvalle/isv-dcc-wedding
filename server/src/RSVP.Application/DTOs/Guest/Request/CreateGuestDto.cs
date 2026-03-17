using System.ComponentModel.DataAnnotations;

namespace RSVP.Application.DTOs.Guest.Request
{
    public record CreateGuestDto
    {
        [Required, MaxLength(50)]
        public required string FullName { get; set; }
        public Guid? InviteId { get; set; }
    }
}
