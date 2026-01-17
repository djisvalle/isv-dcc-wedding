using AutoMapper;
using RSVP.Application.DTOs.Guest.Request;
using RSVP.Application.DTOs.Guest.Response;
using RSVP.Domain.Models;

namespace RSVP.Application.Mappings
{
    public class GuestMappingProfile : Profile
    {
        public GuestMappingProfile()
        {
            CreateMap<Guest, GuestResponseDto>();

            CreateMap<CreateGuestDto, Guest>();

            CreateMap<Guest, GuestDropdownResponseDto>();

            CreateMap<Guest, GuestRsvpResponseDto>();
        }
    }
}
