using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Runtime.InteropServices;
using System.Text;

namespace RSVP.Core.Contracts.Guest
{
    public class UpdateGuestDto
    {
        [Required]
        public required Guid GuestId { get; set; }
        [Required, MaxLength(50)]
        public required string FullName { get; set; }
        public Guid? InviteId { get; set; }
    }

    public class ConfirmGuestRsvpDto
    {
        [Required]
        public required Guid GuestId { get; set; }
        [Required]
        public required bool IsAttending { get; set; }
    }
}
