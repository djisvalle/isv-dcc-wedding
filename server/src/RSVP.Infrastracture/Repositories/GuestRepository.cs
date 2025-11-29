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

        public async Task CreateGuest(Guest guest)
        {
            await _context.Guests.AddAsync(guest);
            await _context.SaveChangesAsync();
        }

        public async Task<List<Guest>> GetGuests() => await _context.Guests.ToListAsync();

        public async Task AddGuestsToInvite(List<Guest> guests)
        {
            await _context.Guests.AddRangeAsync(guests);
            await _context.SaveChangesAsync();
        }

        public async Task<List<Guest>> GetGuestsByIds(List<Guid> guestIds)
        {
            return await _context.Guests
                .Where(g => guestIds.Contains(g.GuestId))
                .ToListAsync();
        }
        
    }
}
