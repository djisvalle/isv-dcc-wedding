using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RSVP.Application.DTOs.Dashboard.Response;
using RSVP.Application.DTOs.Invite.Request;
using RSVP.Application.DTOs.Invite.Response;
using RSVP.Application.Interfaces;
using RSVP.Application.Services;
using RSVP.Domain.Entities;
using RSVP.Domain.Repositories;

namespace RSVP.Application.Services
{
    public class InviteService : IInviteService
    {
        private readonly IInviteRepository _inviteRepository;
        private readonly IMapper _mapper;
        private readonly IGuestRepository _guestRepository;

        public InviteService(IInviteRepository inviteRepository, IMapper mapper, IGuestRepository guestRepository)
        {
            _inviteRepository = inviteRepository;
            _mapper = mapper;
            _guestRepository = guestRepository;
        }

        public async Task<List<InviteResponseDto>> GetAllAsync()
        {
            var invites = await _inviteRepository.GetAllAsync();

            return _mapper.Map<List<InviteResponseDto>>(invites);
        }

        public async Task<InviteResponseDto> GetByIdAsync(Guid id)
        {
            var invite = await _inviteRepository.GetByIdAsync(id);
            return _mapper.Map<InviteResponseDto>(invite);
        }

        public async Task<InviteResponseDto> CreateAsync(CreateInviteDto dto)
        {
            using var transaction = await _inviteRepository.BeginTransactionAsync();

            try
            {
                var invite = _mapper.Map<Invite>(dto);
                await _inviteRepository.AddAsync(invite);

                await _inviteRepository.SaveChangesAsync();

                if (dto.Guests != null && dto.Guests.Any())
                {
                    var newGuests = _mapper.Map<List<Guest>>(dto.Guests);
                    foreach (var guest in newGuests)
                    {
                        guest.InviteId = invite.InviteId;
                    }
                    await _guestRepository.AddRangeAsync(newGuests);
                }

                if (dto.GuestIds != null && dto.GuestIds.Any())
                {
                    await _guestRepository.UpdateGuestsInviteAsync(dto.GuestIds, invite.InviteId);
                }

                await _inviteRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                return _mapper.Map<InviteResponseDto>(invite);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        
        public async Task UpdateAsync(UpdateInviteDto dto)
        {
            using var transaction = await _inviteRepository.BeginTransactionAsync();

            try
            {
                var existingInvite = await _inviteRepository.GetByIdForUpdateAsync(dto.InviteId);
                if (existingInvite == null) throw new KeyNotFoundException("Invite not found");

                _mapper.Map(dto, existingInvite);

                if (dto.Guests != null && dto.Guests.Any())
                {
                    var newGuestEntities = _mapper.Map<List<Guest>>(dto.Guests);
                    foreach (var guest in newGuestEntities) guest.InviteId = dto.InviteId;
                    await _guestRepository.AddRangeAsync(newGuestEntities);
                }

                if (dto.GuestIds != null && dto.GuestIds.Any())
                {
                    var currentGuestIds = existingInvite.Guests?.Select(g => g.GuestId).ToList() ?? new List<Guid>();

                    var idsToAdd = dto.GuestIds.Except(currentGuestIds).ToList();
                    if (idsToAdd.Any())
                    {
                        await _guestRepository.UpdateGuestsInviteAsync(idsToAdd, dto.InviteId);
                    }

                    var idsToRemove = currentGuestIds.Except(dto.GuestIds).ToList();
                    if (idsToRemove.Any())
                    {
                        await _guestRepository.UpdateGuestsInviteAsync(idsToRemove, null);
                    }
                }

                await _inviteRepository.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<List<InviteDashboardResponseDto>> GetInviteDashboardAsync()
        {
            var invites = await _inviteRepository.GetAllAsync();

            return _mapper.Map<List<InviteDashboardResponseDto>>(invites);
        }
    }
}
