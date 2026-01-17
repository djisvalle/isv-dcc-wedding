using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RSVP.Application.DTOs.Guest.Request;
using RSVP.Application.DTOs.Guest.Response;
using RSVP.Application.DTOs.User;
using RSVP.Core.Interfaces;
using RSVP.Core.Models;

namespace RSVP.API.Controllers
{
    [Authorize(Policy = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class GuestController : ControllerBase
    {
        private readonly IGuestService _guestService;

        public GuestController(IGuestService guestService) => _guestService = guestService;

        [HttpGet]
        public async Task<ActionResult<List<GuestResponseDto>>> GetAll() => 
            Ok(await _guestService.GetAllAsync());

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<GuestResponseDto>> GetById(Guid id)
        {
            var guest = await _guestService.GetByIdAsync(id);

            if (guest == null) return NotFound();

            return Ok(guest);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateGuestDto dto)
        {
            var createdGuest = await _guestService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = createdGuest.GuestId });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateGuestDto dto)
        {
            if (id != dto.GuestId)
            {
                return BadRequest("Guest ID in URL does not match Guest ID in body.");
            }

            await _guestService.UpdateAsync(dto);
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _guestService.DeleteAsync(id);
            return NoContent();
        }

        [HttpGet("dropdown")]
        public async Task<ActionResult<List<GuestDropdownResponseDto>>> GetDropdown() => 
            Ok(await _guestService.GetDropdownAsync());

        [AllowAnonymous]
        [HttpGet("get-by-invite/{invite:guid}")]
        public async Task<ActionResult<List<GuestRsvpResponseDto>>> GetByInviteForRsvp(Guid invite) =>
            Ok(await _guestService.GetByInviteForRsvpAsync(invite));

        [AllowAnonymous]
        [HttpPatch("confirm-rsvp")]
        public async Task<IActionResult> ConfirmRsvp([FromBody] List<ConfirmGuestRsvpDto> dto)
        {
            if (dto == null || !dto.Any()) return BadRequest("No data provided.");

            await _guestService.ConfirmRsvpAsync(dto);
            return NoContent();
        }
    }
}
