using RSVP.Core.Contracts.Guest;
using RSVP.Core.Contracts.Invite;
using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Interfaces
{
    public interface IInviteService
    {
        Task CreateInvite(CreateInviteDto dto);
    }
}