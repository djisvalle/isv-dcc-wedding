using RSVP.Core.Contracts.Guest;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Runtime.InteropServices;
using System.Text;

namespace RSVP.Core.Contracts.Invite
{
    public class CreateInviteDto
    {
        [Required, MaxLength(50)]
        public required string InviteName { get; set; }
        public List<CreateGuestDto>? Guests { get; set; }
        public List<Guid>? GuestIds { get; set; }
    }
}
