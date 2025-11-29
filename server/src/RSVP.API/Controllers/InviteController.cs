using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Razor.TagHelpers;
using RSVP.Core.Contracts.Invite;
using RSVP.Core.Interfaces;
using RSVP.Core.Models;
using RSVP.Core.Services;

namespace RSVP.API.Controllers
{
    [Authorize(Policy = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class InviteController : ControllerBase
    {
        private readonly IInviteService _inviteService;
        private readonly IGuestService _guestService;

        public InviteController(IInviteService inviteService, IGuestService guestService)
        {
            _inviteService = inviteService;
            _guestService = guestService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateInvite(CreateInviteDto invite)
        {
            var inviteId = await _inviteService.CreateInvite(invite);

            if (invite.Guests != null)
            {
                await _guestService.AddGuestsToInvite(invite.Guests, inviteId);
            }

            if (invite.GuestIds != null)
            {
                await _guestService.AddExistingGuestsToInvite(invite.GuestIds, inviteId);
            }

            return Ok();
        }
    }
}
