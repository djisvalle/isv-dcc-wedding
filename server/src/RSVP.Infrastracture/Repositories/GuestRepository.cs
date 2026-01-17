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



        //public async Task AddGuestsToInvite(List<Guest> guests)
        //{
        //    await _context.Guests.AddRangeAsync(guests);
        //    await _context.SaveChangesAsync();
        //}

        //public async Task AddExistingGuestsToInvite(List<Guid> guestIds, Guid inviteId)
        //{
        //    await _context.Guests
        //        .Where(g => guestIds.Contains(g.GuestId))
        //        .ExecuteUpdateAsync(setters =>
        //            setters.SetProperty(g => g.InviteId, inviteId)
        //        );
        //}

        //public async Task RemoveGuestsFromInvite(List<Guid> guestIds, Guid inviteId)
        //{
        //    await _context.Guests
        //        .Where(g => guestIds.Contains(g.GuestId))
        //        .ExecuteUpdateAsync(setters =>
        //            setters.SetProperty(g => g.InviteId, (Guid?)null)
        //        );
        //}

        //public async Task<List<GuestDashboardResponseDto>> GetGuestDashboard()
        //{
        //    return await _context.Guests
        //        .Select(g => new GuestDashboardResponseDto
        //        {
        //            GuestId = g.GuestId,
        //            FullName = g.FullName,
        //            InviteName = g.Invite != null ? g.Invite.InviteName : "",
        //            IsAttending = g.IsAttending.HasValue ? (g.IsAttending.Value ? "Yes" : "No") : "Pending"
        //        })
        //        .AsNoTracking()
        //        .ToListAsync();
        //}



        //public async Task<List<GuestResponseDto>> GetGuestsByInvite(Guid inviteId)
        //{
        //    return await _context.Guests
        //        .Where(g => g.InviteId == inviteId)
        //        .Select(g => new GuestResponseDto
        //        {
        //            GuestId = g.GuestId,
        //            FullName = g.FullName,
        //            IsAttending = g.IsAttending,
        //            CreatedDateTime = g.CreatedDateTime
        //        })
        //        .AsNoTracking()
        //        .ToListAsync();
        //}

        //public async Task<List<GuestRsvpResponseDto>> GetGuestsByInviteForRsvp(Guid inviteId)
        //{
        //    return await _context.Guests
        //        .Where(g => g.InviteId == inviteId)
        //        .Select(g => new GuestRsvpResponseDto
        //        {
        //            FullName = g.FullName,
        //            GuestId = g.GuestId,
        //            IsAttending = g.IsAttending ?? false,
        //            InviteName = g.Invite != null ? g.Invite.InviteName : ""
        //        })
        //        .AsNoTracking()
        //        .ToListAsync();
        //}

        //public async Task ConfirmGuestRsvp(List<ConfirmGuestRsvpDto> dto)
        //{
        //    foreach (var guestRsvp in dto)
        //    {
        //        await _context.Guests
        //            .Where(g => g.GuestId == guestRsvp.GuestId)
        //            .ExecuteUpdateAsync(setters =>
        //                setters
        //                    .SetProperty(g => g.IsAttending, guestRsvp.IsAttending)
        //            );
        //    }
        //}
    }
}
