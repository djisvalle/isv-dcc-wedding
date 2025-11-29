using Microsoft.AspNetCore.Identity;
using RSVP.Core.Contracts.Invite;
using RSVP.Core.Interfaces;
using RSVP.Core.Models;
using RSVP.Core.Repositories;

namespace RSVP.Core.Services
{
    public class InviteService : IInviteService
    {
        private readonly IInviteRepository _db;

        public InviteService(IInviteRepository db) => _db = db;

        public async Task CreateInvite(CreateInviteDto dto)
        {
            var invite = new Invite
            {
                FamilyName = dto.FamilyName,
                InviteUrl = dto.InviteUrl
            };

            await _db.CreateInvite(invite);
        }
        
    }
}
