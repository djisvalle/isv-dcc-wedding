using System.ComponentModel.DataAnnotations;

namespace RSVP.Application.DTOs.Guest.Request
{
    public class ConfirmGuestRsvpDto
    {
        [Required]
        public required Guid GuestId { get; set; }
        [Required]
        public required bool IsAttending { get; set; }
    }
}
