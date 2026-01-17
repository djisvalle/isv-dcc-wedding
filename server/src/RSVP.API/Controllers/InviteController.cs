using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RSVP.Application.DTOs.Invite.Request;
using RSVP.Application.DTOs.Invite.Response;
using RSVP.Application.Interfaces;

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

        [HttpGet]
        public async Task<ActionResult<List<InviteResponseDto>>> GetAll() => 
            Ok(await _inviteService.GetAllAsync());

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<InviteResponseDto>> GetById(Guid id)
        {
            var invite = await _inviteService.GetByIdAsync(id);
            
            if (invite == null) return NotFound();
            
            return Ok(invite);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateInviteDto invite)
        {
            var createdInvite = await _inviteService.CreateAsync(invite);
            return CreatedAtAction(nameof(GetById), new { id = invite.InviteId });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateInviteDto dto)
        {
            if (id != dto.InviteId)
            {
                return BadRequest("Invite ID in URL does not match Invite ID in body.");
            }

            await _inviteService.UpdateAsync(dto);
            return NoContent();
        }
    }
}
