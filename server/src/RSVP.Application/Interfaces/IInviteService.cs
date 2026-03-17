using RSVP.Application.DTOs.Dashboard.Response;
using RSVP.Application.DTOs.Invite.Request;
using RSVP.Application.DTOs.Invite.Response;

namespace RSVP.Application.Interfaces
{
    public interface IInviteService
    {
        Task<List<InviteResponseDto>> GetAllAsync();
        Task<InviteResponseDto> GetByIdAsync(Guid id);
        Task<InviteResponseDto> CreateAsync(CreateInviteDto dto);
        Task UpdateAsync(UpdateInviteDto dto);
        Task<List<InviteDashboardResponseDto>> GetInviteDashboardAsync();
    }
}