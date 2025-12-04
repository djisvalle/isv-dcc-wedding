using Azure.Core.GeoJson;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Microsoft.EntityFrameworkCore;
using RSVP.Core.Models;
using RSVP.Core.Repositories;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Infrastracture.Repositories
{
    public  class GuestRepository : IGuestRepository
    {
        private readonly RsvpDbContext _context;

        public GuestRepository(RsvpDbContext context) => _context = context;

        public async Task AddGuestsToInvite(List<Guest> guests)
        {
            await _context.Guests.AddRangeAsync(guests);
            await _context.SaveChangesAsync();
        }

        public async Task CreateGuest(Guest guest)
        {
            await _context.Guests.AddAsync(guest);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateGuest(Guest guest)
        {
            _context.Guests.Update(guest);
            await _context.SaveChangesAsync();
        }

        public async Task<List<Guest>> GetGuests() => await _context.Guests.ToListAsync();

        public async Task<List<Guest>> GetGuestsByIds(List<Guid> guestIds)
        {
            return await _context.Guests
                .Where(g => guestIds.Contains(g.GuestId))
                .ToListAsync();
        }

        public async Task AddExistingGuestsToInvite(List<Guid> guestIds, Guid inviteId)
        {
            await _context.Guests
                .Where(g => guestIds.Contains(g.GuestId))
                .ExecuteUpdateAsync(setters =>
                    setters.SetProperty(g => g.InviteId, inviteId)
                );
        }

        public async Task<List<GuestDashboard>> GetGuestDashboard()
        {
            return await _context.Guests
                .Select(g => new GuestDashboard
                {
                    GuestId = g.GuestId,
                    FullName = g.FullName,
                    InviteName = g.Invite != null ? g.Invite.FamilyName : "",
                    InviteUrl = g.Invite != null ? g.Invite.InviteUrl : "",
                    IsAttending = g.IsAttending.HasValue ? (g.IsAttending.Value ? "Yes" : "No") : "Pending"
                })
                .ToListAsync();
        }
    }
}
