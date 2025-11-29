using RSVP.Core.Contracts.Guest;
using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Interfaces
{
    public interface IGuestService
    {
        Task CreateGuest(CreateGuestDto dto);
        Task<List<Guest>> GetGuests();
        Task AddGuestsToInvite(List<CreateGuestDto> dto, Guid inviteId);
        Task AddExistingGuestsToInvite(List<Guid> dto, Guid inviteId);
    }
}
