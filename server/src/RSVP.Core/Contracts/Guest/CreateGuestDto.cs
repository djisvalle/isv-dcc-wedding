using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Runtime.InteropServices;
using System.Text;

namespace RSVP.Core.Contracts.Guest
{
    public class CreateGuestDto
    {
        [Required, MaxLength(50)]
        public required string FullName { get; set; }
        public bool? IsAttending { get; set; }
        public Guid? InviteId { get; set; }
    }
}
