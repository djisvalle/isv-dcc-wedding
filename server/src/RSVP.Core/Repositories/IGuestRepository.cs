using RSVP.Domain.Entities;

namespace RSVP.Domain.Repositories
{
    public interface IGuestRepository
    {
        Task<IEnumerable<Guest>> GetAllAsync();
        Task<Guest?> GetByIdAsync(Guid id);
        Task<IEnumerable<Guest>> GetByIdsAsync(IEnumerable<Guid> ids);
        Task AddAsync(Guest guest);
        void Update(Guest guest);
        void Delete(Guest guest);
        Task<bool> SaveChangesAsync();
        Task<IEnumerable<Guest>> GetNoInviteAsync();
        Task<IEnumerable<Guest>> GetByInviteAsync(Guid inviteId);
        //Task AddGuestsToInvite(List<Guest> guests);

        //Task AddExistingGuestsToInvite(List<Guid> guestIds, Guid inviteId);
        //Task RemoveGuestsFromInvite(List<Guid> guestIds, Guid inviteId);
        //Task<List<Guest>> GetGuestDashboard();
        //Task<List<Guest>> GetGuestDropdown();
        //Task<List<Guest>> GetGuestsByInvite(Guid inviteId);

        //
        //Task ConfirmGuestRsvp(List<Guest> dto);
    }
}
