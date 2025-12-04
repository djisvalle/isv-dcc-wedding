using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Repositories
{
    public interface IGuestRepository
    {
        Task<List<Guest>> GetGuests();
        Task CreateGuest(Guest guest);
        Task UpdateGuest(Guest guest);
        Task AddGuestsToInvite(List<Guest> guests);
        Task<List<Guest>> GetGuestsByIds(List<Guid> dto);
        Task AddExistingGuestsToInvite(List<Guid> guestIds, Guid inviteId);
        Task<List<GuestDashboard>> GetGuestDashboard();
    }
}
