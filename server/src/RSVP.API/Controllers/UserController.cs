using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RSVP.Application.DTOs.User;
using RSVP.Core.Interfaces;

namespace RSVP.API.Controllers
{
    [Authorize(Policy = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService) => _userService = userService;

        public async Task<IActionResult> GetUsers()
        {
            return Ok(await _userService.GetUsers());
        }


        [HttpPost]
        public async Task<IActionResult> CreateUser(CreateUserDto dto)
        {
            await _userService.CreateUser(dto);

            return Ok();
        }
    }
}
