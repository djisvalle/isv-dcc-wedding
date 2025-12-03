using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RSVP.Core.Contracts.Guest;
using RSVP.Core.Contracts.User;
using RSVP.Core.Interfaces;
using RSVP.Core.Models;

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
        public async Task<ActionResult<List<GuestDashboard>>> GetGuestDashboard() => Ok(await _guestService.GetGuestDashboard());

        [HttpGet("invite")]
        public async Task<ActionResult<List<InviteDashboard>>> GetInviteDashboard() => Ok(await _inviteService.GetInviteDashboard());
    }
}
