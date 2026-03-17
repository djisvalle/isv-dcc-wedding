using Microsoft.EntityFrameworkCore.Storage;
using RSVP.Domain.Entities;

namespace RSVP.Domain.Repositories
{
    public interface IInviteRepository
    {
        Task<IEnumerable<Invite>> GetAllAsync();
        Task<Invite?> GetByIdAsync(Guid id);
        Task<Invite?> GetByIdForUpdateAsync(Guid id);
        Task AddAsync(Invite invite);
        void Update(Invite invite);
        Task<bool> SaveChangesAsync();
        Task<IDbContextTransaction> BeginTransactionAsync();
        //Task<List<InviteDashboardResponseDto>> GetInviteDashboard();
    }
}
