using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Models
{
    public class Invite
    {
        public Guid InviteId { get; set; }
        public required string FamilyName { get; set; }
        public required string InviteUrl { get; set; }
        public List<Guest>? Guests { get; set; }
        public DateTime CreatedDateTime { get; set; }
    }
}
