using AutoMapper;
using RSVP.Application.DTOs.Dashboard.Response;
using RSVP.Application.DTOs.Invite.Request;
using RSVP.Application.DTOs.Invite.Response;
using RSVP.Domain.Entities;

namespace RSVP.Application.Mappings
{
    public class InviteMappingProfile : Profile
    {
        public InviteMappingProfile()
        {
            CreateMap<Invite, InviteResponseDto>();

            CreateMap<CreateInviteDto, Invite>();

            CreateMap<Invite, InviteDashboardResponseDto>();
        }
    }
}
