using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Repositories
{
    public interface IInviteRepository
    {
        Task<Guid> CreateInvite(Invite invite);
        Task<List<InviteDashboard>> GetInviteDashboard();
    }
}
