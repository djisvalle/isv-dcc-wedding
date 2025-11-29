using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Razor.TagHelpers;
using RSVP.Core.Contracts.Invite;
using RSVP.Core.Interfaces;

namespace RSVP.API.Controllers
{
    [Authorize(Policy = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class InviteController : ControllerBase
    {
        private readonly IInviteService _inviteService;

        public InviteController(IInviteService inviteService) => _inviteService = inviteService;
        

        [HttpPost]
        public async Task<IActionResult> CreateInvite(CreateInviteDto invite)
        {
            await _inviteService.CreateInvite(invite);

            return Ok();
        }
    }
}
