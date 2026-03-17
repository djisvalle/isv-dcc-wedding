using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RSVP.Application.DTOs.Dashboard.Response;
using RSVP.Application.Interfaces;

namespace RSVP.API.Controllers
{
    [Authorize(Policy = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly IGuestService _guestService;
        private readonly IInviteService _inviteService;

        public DashboardController(IGuestService guestService, IInviteService inviteService)
        {
            _guestService = guestService;
            _inviteService = inviteService;
        }

        [HttpGet("guest")]
        public async Task<ActionResult<List<GuestDashboardResponseDto>>> GetGuestDashboard() =>
            Ok(await _guestService.GetGuestDashboardAsync());

        [HttpGet("invite")]
        public async Task<ActionResult<List<InviteDashboardResponseDto>>> GetInviteDashboard() =>
            Ok(await _inviteService.GetInviteDashboardAsync());
    }
}
