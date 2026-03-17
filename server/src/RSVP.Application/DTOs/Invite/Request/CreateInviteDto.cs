using RSVP.Application.DTOs.Guest.Request;
using System.ComponentModel.DataAnnotations;

namespace RSVP.Application.DTOs.Invite.Request
{
    public record CreateInviteDto
    {
        [Required, MaxLength(50)]
        public required string InviteName { get; set; }
        public List<CreateGuestDto>? Guests { get; set; }
        public List<Guid>? GuestIds { get; set; }
    }
}
