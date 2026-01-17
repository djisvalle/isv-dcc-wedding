using AutoMapper;
using Microsoft.AspNetCore.Identity;
using RSVP.Application.DTOs.Dashboard.Response;
using RSVP.Application.DTOs.Invite.Request;
using RSVP.Application.DTOs.Invite.Response;
using RSVP.Application.Interfaces;
using RSVP.Domain.Entities;
using RSVP.Domain.Repositories;

namespace RSVP.Core.Services
{
    public class InviteService : IInviteService
    {
        private readonly IInviteRepository _inviteRepository;
        private readonly IMapper _mapper;
        private readonly IGuestService _guestService;

        public InviteService(IInviteRepository inviteRepository, IMapper mapper, IGuestService guestService)
        {
            _inviteRepository = inviteRepository;
            _mapper = mapper;
            _guestService = guestService;
        }

        public async Task<List<InviteResponseDto]>> GetAllAsync()
        {
            var invites = await _inviteRepository.GetAllAsync();

            return _mapper.Map<List<InviteResponseDto>>(invites);
        }

        public async Task CreateInvite(CreateInviteDto dto)
        {
            var invite = _mapper.Map<Invite>(dto);
            await _inviteRepository.AddAsync(invite);

            if (dto.Guests != null)
            {
                await _guestService.AddGuestsToInvite(dto.Guests, invite.InviteId);
            }

            if (dto.GuestIds != null)
            {
                await _guestService.AddExistingGuestsToInvite(dto.GuestIds, invite.InviteId);
            }
        }
        
        public async Task UpdateInvite(UpdateInviteDto dto)
        {
            var invite = new Invite
            {
                InviteId = dto.InviteId,
                InviteName = dto.InviteName
            };

            if (dto.Guests != null)
            {
                await _guestService.AddGuestsToInvite(dto.Guests, dto.InviteId);
            }

            if (dto.GuestIds != null)
            {
                var guestList = await _guestService.GetGuestsByInviteAsync(dto.InviteId);
                
                var newGuests = dto.GuestIds
                    .Where(gid => guestList.All(g => g.GuestId != gid))
                    .ToList();

                await _guestService.AddExistingGuestsToInvite(newGuests, dto.InviteId);

                var removedGuests = guestList
                    .Where(g => dto.GuestIds.All(gid => gid != g.GuestId))
                    .Select(g => g.GuestId)
                    .ToList();

                await _guestService.RemoveGuestsFromInvite(removedGuests, dto.InviteId);
            }

            await _inviteRepository.UpdateInvite(invite);
        }

        public async Task<List<InviteDashboardResponseDto>> GetInviteDashboard() => await _inviteRepository.GetInviteDashboard();
    }
}
