using Microsoft.EntityFrameworkCore;
using RSVP.Domain.Entities;
using RSVP.Domain.Repositories;

namespace RSVP.Infrastracture.Repositories
{
    public class GuestRepository : IGuestRepository
    {
        private readonly RsvpDbContext _context;

        public GuestRepository(RsvpDbContext context) => _context = context;

        public async Task<IEnumerable<Guest>> GetAllAsync() =>
            await _context.Guests.AsNoTracking().ToListAsync();

        public async Task<Guest?> GetByIdAsync(Guid id) =>
            await _context.Guests.FindAsync(id);

        public async Task<IEnumerable<Guest>> GetByIdsAsync(IEnumerable<Guid> ids) =>
            await _context.Guests.Where(g => ids.Contains(g.GuestId)).ToListAsync();

        public async Task AddAsync(Guest guest) =>
            await _context.Guests.AddAsync(guest);

        public void Update(Guest guest) =>
            _context.Guests.Update(guest);

        public void Delete(Guest guest) =>
            _context.Guests.Remove(guest);

        public async Task<bool> SaveChangesAsync() =>
            await _context.SaveChangesAsync() > 0;

        public async Task<IEnumerable<Guest>> GetNoInviteAsync() =>
            await _context.Guests.AsNoTracking().Where(g => g.Invite == null).ToListAsync();

        public async Task<IEnumerable<Guest>> GetByInviteAsync(Guid inviteId) =>
            await _context.Guests.AsNoTracking().Where(g => g.InviteId == inviteId).ToListAsync();

        public async Task AddRangeAsync(IEnumerable<Guest> guests) =>
            await _context.Guests.AddRangeAsync(guests);

        public async Task UpdateGuestsInviteAsync(IEnumerable<Guid> guestIds, Guid? inviteId)
        {
            await _context.Guests
                .Where(g => guestIds.Contains(g.GuestId))
                .ExecuteUpdateAsync(setters =>
                    setters.SetProperty(g => g.InviteId, inviteId)
                );
        }
    }
}
