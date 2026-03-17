using AutoMapper;
using Microsoft.AspNetCore.Identity;
using RSVP.Application.DTOs.Dashboard.Response;
using RSVP.Application.DTOs.Guest.Request;
using RSVP.Application.DTOs.Guest.Response;
using RSVP.Application.Interfaces;
using RSVP.Domain.Entities;
using RSVP.Domain.Repositories;

namespace RSVP.Application.Services
{
    public class GuestService : IGuestService
    {
        private readonly IGuestRepository _guestRepository;
        private readonly IMapper _mapper;

        public GuestService(IGuestRepository guestRepository, IMapper mapper)
        {
            _guestRepository = guestRepository;
            _mapper = mapper;
        }

        public async Task<List<GuestResponseDto>> GetAllAsync()
        {
            var guests = await _guestRepository.GetAllAsync();

            return _mapper.Map<List<GuestResponseDto>>(guests);
        }

        public async Task<GuestResponseDto> GetByIdAsync(Guid id)
        {
            var guest = await _guestRepository.GetByIdAsync(id);

            return _mapper.Map<GuestResponseDto>(guest);
        }

        public async Task<GuestResponseDto> CreateAsync(CreateGuestDto dto)
        {
            var guest = _mapper.Map<Guest>(dto);
            await _guestRepository.AddAsync(guest);
            await _guestRepository.SaveChangesAsync();
            return _mapper.Map<GuestResponseDto>(guest);
        }

        public async Task UpdateAsync(UpdateGuestDto dto)
        {
            var existingGuest = await _guestRepository.GetByIdAsync(dto.GuestId);
            if (existingGuest == null) throw new KeyNotFoundException("Guest not found");

            _mapper.Map(dto, existingGuest);
            _guestRepository.Update(existingGuest);
            await _guestRepository.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var existingGuest = await _guestRepository.GetByIdAsync(id);
            if (existingGuest == null) throw new KeyNotFoundException("Guest not found");
            
            _guestRepository.Delete(existingGuest);
            await _guestRepository.SaveChangesAsync();
        }

        public async Task<List<GuestDropdownResponseDto>> GetDropdownAsync()
        {
            var guests = await _guestRepository.GetNoInviteAsync();

            return _mapper.Map<List<GuestDropdownResponseDto>>(guests);
        }

        public async Task<List<GuestResponseDto>> GetByInviteAsync(Guid inviteId)
        {
            var guests = await _guestRepository.GetByInviteAsync(inviteId);

            return _mapper.Map<List<GuestResponseDto>>(guests);
        }

        public async Task<List<GuestRsvpResponseDto>> GetByInviteForRsvpAsync(Guid inviteId)
        {
            var guests = await _guestRepository.GetByInviteAsync(inviteId);

            return _mapper.Map<List<GuestRsvpResponseDto>>(guests);
        }

        public async Task ConfirmRsvpAsync(List<ConfirmGuestRsvpDto> dto)
        {
            var guestIds = dto.Select(x => x.GuestId).ToList();

            var guests = await _guestRepository.GetByIdsAsync(guestIds);

            foreach (var guest in guests)
            {
                var updateInfo = dto.First(d => d.GuestId == guest.GuestId);

                guest.IsAttending = updateInfo.IsAttending;
                guest.RsvpDate = DateTime.UtcNow;
            }

            await _guestRepository.SaveChangesAsync();
        }

        public async Task<List<GuestDashboardResponseDto>> GetGuestDashboardAsync()
        {
            var guests = await _guestRepository.GetAllAsync();

            return _mapper.Map<List<GuestDashboardResponseDto>>(guests);
        }
    }
}
