using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RSVP.Core.Contracts.Guest;
using RSVP.Core.Contracts.User;
using RSVP.Core.Interfaces;
using RSVP.Core.Models;
using System.Reflection.Metadata.Ecma335;

namespace RSVP.API.Controllers
{
    [Authorize(Policy = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class GuestController : ControllerBase
    {
        private readonly IGuestService _guestService;

        public GuestController(IGuestService guestService) => _guestService = guestService;

        [HttpPost]
        public async Task<IActionResult> CreateGuest(CreateGuestDto dto)
        {
            await _guestService.CreateGuest(dto);
            return Ok();
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateGuest(Guid id, [FromBody] UpdateGuestDto dto)
        {
            if (id != dto.GuestId)
            {
                return BadRequest("Guest ID in URL does not match Guest ID in body.");
            }

            await _guestService.UpdateGuest(dto);
            return NoContent();
        }

        [HttpGet]
        public async Task<ActionResult<List<Guest>>> GetGuests() => Ok(await _guestService.GetGuests());

        [HttpGet("guest-dropdown")]
        public async Task<ActionResult<List<GuestDropdown>>> GetGuestDropdown() => Ok(await _guestService.GetGuestDropdown());

        [AllowAnonymous]
        [HttpGet("get-by-invite/{invite:guid}")]
        public async Task<ActionResult<List<GuestRsvp>>> GetGuestsByInviteForRsvp(Guid invite)
        {
            var guests = await _guestService.GetGuestsByInviteForRsvp(invite);
            return Ok(guests);
        }

        [AllowAnonymous]
        [HttpPatch("confirm-guest-rsvp")]
        public async Task<IActionResult> ConfirmGuestRsvp([FromBody] List<ConfirmGuestRsvpDto> dto)
        {
            await _guestService.ConfirmGuestRsvp(dto);

            return NoContent();
        }
    }
}
