using RSVP.Application.DTOs.Dashboard.Response;
using RSVP.Application.DTOs.Guest.Request;
using RSVP.Application.DTOs.Guest.Response;

namespace RSVP.Application.Interfaces
{
    public interface IGuestService
    {
        Task<List<GuestResponseDto>> GetAllAsync();
        Task<GuestResponseDto> GetByIdAsync(Guid id);
        Task<GuestResponseDto> CreateAsync(CreateGuestDto dto);
        Task UpdateAsync(UpdateGuestDto dto);
        Task DeleteAsync(Guid id);
        Task<List<GuestDropdownResponseDto>> GetDropdownAsync();
        Task<List<GuestResponseDto>> GetByInviteAsync(Guid inviteId);
        Task<List<GuestRsvpResponseDto>> GetByInviteForRsvpAsync(Guid inviteId);
        Task ConfirmRsvpAsync(List<ConfirmGuestRsvpDto> dto);
        //Task<List<GuestDashboardResponseDto>> GetGuestDashboardAsync();
        //Task AddGuestsToInvite(List<CreateGuestDto> dto, Guid inviteId);
        //Task AddExistingGuestsToInvite(List<Guid> guestIds, Guid inviteId);
        //Task RemoveGuestsFromInvite(List<Guid> guestIds, Guid inviteId);

    }
}
