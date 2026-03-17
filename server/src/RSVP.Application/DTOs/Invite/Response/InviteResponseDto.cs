using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Application.DTOs.Invite.Response
{
    public record InviteResponseDto
    {
        public Guid InviteId { get; set; }
        public required string InviteName { get; set; }
        public DateTime CreatedDateTime { get; set; }
    }
}
