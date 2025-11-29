using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RSVP.Core.Contracts.Guest;
using RSVP.Core.Contracts.User;
using RSVP.Core.Interfaces;

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

        [HttpGet]
        public async Task<IActionResult> GetGuests() => Ok(await  _guestService.GetGuests());
        
    }
}
