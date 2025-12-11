using Microsoft.EntityFrameworkCore;
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

        public async Task<List<Invite>> GetInvites()
        {
            return await _context.Invites
                .Include(i => i.Guests)
                .ToListAsync();
        }

        public async Task<Guid> CreateInvite(Invite invite)
        {
            await _context.Invites.AddAsync(invite);
            await _context.SaveChangesAsync();

            return invite.InviteId;
        }

        public async Task<List<InviteDashboard>> GetInviteDashboard()
        {
            return await _context.Invites
                .Select(i => new InviteDashboard
                {
                    InviteId = i.InviteId,
                    InviteName = i.InviteName,
                    GuestCount = i.Guests == null ? 0 : i.Guests.Count
                })
                .ToListAsync();
        }
    }
}
