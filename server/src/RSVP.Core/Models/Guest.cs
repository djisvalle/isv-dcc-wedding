using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Models
{
    public class Guest
    {
        public Guid GuestId { get; set; }
        public required string FullName { get; set; }
        public bool? IsAttending { get; set; }
        public DateTime CreatedDateTime { get; set; }
        public Guid? InviteId { get; set; }
        public Invite? Invite { get; set; }
    }
}
