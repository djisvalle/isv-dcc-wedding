using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RSVP.Domain.Entities;
using RSVP.Domain.Repositories;
using System.Data;

namespace RSVP.Infrastracture.Repositories
{
    public class InviteRepository : IInviteRepository
    {
        private readonly RsvpDbContext _context;

        public InviteRepository(RsvpDbContext context) => _context = context;

        public async Task<IEnumerable<Invite>> GetAllAsync() =>
            await _context.Invites.AsNoTracking().Include(i => i.Guests).ToListAsync();

        public async Task<Invite?> GetByIdAsync(Guid id) =>
            await _context.Invites.AsNoTracking().Include(i => i.Guests).FirstOrDefaultAsync(i => i.InviteId == id);

        public async Task<Invite?> GetByIdForUpdateAsync(Guid id) =>
            await _context.Invites.Include(i => i.Guests).FirstOrDefaultAsync(i => i.InviteId == id);

        public async Task AddAsync(Invite invite) =>
            await _context.Invites.AddAsync(invite);
        
        public void Update(Invite invite) =>
            _context.Invites.Update(invite);

        public async Task<bool> SaveChangesAsync() =>
            await _context.SaveChangesAsync() > 0;

        public async Task<IDbContextTransaction> BeginTransactionAsync() =>
            await _context.Database.BeginTransactionAsync();

        //public async Task<List<InviteDashboardResponseDto>> GetInviteDashboard()
        //{
        //    return await _context.Invites
        //        .Select(i => new InviteDashboardResponseDto
        //        {
        //            InviteId = i.InviteId,
        //            InviteName = i.InviteName,
        //            GuestCount = i.Guests == null ? 0 : i.Guests.Count
        //        })
        //        .AsNoTracking()
        //        .ToListAsync();
        //}
    }
}
