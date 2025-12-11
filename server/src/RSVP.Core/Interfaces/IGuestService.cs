using RSVP.Core.Contracts.Guest;
using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Interfaces
{
    public interface IGuestService
    {
        Task<List<Guest>> GetGuests();
        Task CreateGuest(CreateGuestDto dto);
        Task UpdateGuest(UpdateGuestDto dto);
        Task AddGuestsToInvite(List<CreateGuestDto> dto, Guid inviteId);
        Task AddExistingGuestsToInvite(List<Guid> guestIds, Guid inviteId);
        Task<List<GuestDashboard>> GetGuestDashboard();
        Task<List<GuestDropdown>> GetGuestDropdown();
        Task<List<GuestRsvp>> GetGuestsByInviteForRsvp(Guid inviteId);
        Task ConfirmGuestRsvp(List<ConfirmGuestRsvpDto> dto);
    }
}
