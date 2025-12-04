using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RSVP.Core.Contracts.Guest;
using RSVP.Core.Interfaces;
using RSVP.Core.Models;
using RSVP.Core.Repositories;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks.Dataflow;

namespace RSVP.Core.Services
{
    public class GuestService : IGuestService
    {
        private readonly IGuestRepository _db;

        public GuestService(IGuestRepository db) => _db = db;

        public async Task<List<Guest>> GetGuests() => await _db.GetGuests();

        public async Task CreateGuest(CreateGuestDto dto)
        {
            var guest = new Guest
            {
                FullName = dto.FullName,                
                InviteId = dto.InviteId
         
            };

            await _db.CreateGuest(guest);
        }

        public async Task UpdateGuest(UpdateGuestDto dto)
        {
            var guest = new Guest
            {
                GuestId = dto.GuestId,
                FullName = dto.FullName,
                InviteId = dto.InviteId
            };

            await _db.UpdateGuest(guest);
        }

        public async Task AddGuestsToInvite(List<CreateGuestDto> dto, Guid inviteId)
        {
            var guests = dto.Select(x => new Guest
            {
                FullName = x.FullName,
                InviteId = inviteId
            }).ToList();

            await _db.AddGuestsToInvite(guests);
        }

        public async Task AddExistingGuestsToInvite(List<Guid> guestIds, Guid inviteId)
        {
            await _db.AddExistingGuestsToInvite(guestIds, inviteId);
        }

        public async Task<List<GuestDashboard>> GetGuestDashboard()
        {
            return await _db.GetGuestDashboard();
        }
    }
}
