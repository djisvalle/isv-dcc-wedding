using RSVP.Core.Models;
using RSVP.Core.Repositories;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Infrastracture.Repositories
{
    public class InviteRepository : IInviteRepository
    {
        private readonly RsvpDbContext _context;

        public InviteRepository(RsvpDbContext context) => _context = context;

        public async Task<Guid> CreateInvite(Invite invite)
        {
            await _context.Invites.AddAsync(invite);
            await _context.SaveChangesAsync();

            return invite.InviteId;
        }
    }
}
