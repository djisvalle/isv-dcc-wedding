using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;

namespace RSVP.Core.Models
{
    public class Guest
    {
        public Guid GuestId { get; set; }
        public required string FullName { get; set; }
        public bool? IsAttending { get; set; }
        public DateTime CreatedDateTime { get; set; }
        public Guid? InviteId { get; set; }
        [JsonIgnore]
        public Invite? Invite { get; set; }
    }

    public class GuestDropdown
    {
        public Guid GuestId { get; set; }
        public required string FullName { get; set; }
    }

    public class GuestRsvp
    {
        public Guid GuestId { get; set; }
        public required string FullName { get; set; }
        public bool IsAttending { get; set; }
        public string InviteName { get; set; } = string.Empty;
    }
}
