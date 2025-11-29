using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RSVP.Core.Contracts.Auth;
using RSVP.Core.Contracts.User;
using RSVP.Core.Interfaces;

namespace RSVP.API.Controllers
{
    [AllowAnonymous]
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IPasswordService _passwordService;

        public AuthController(IUserService userService, IPasswordService passwordService)
        {
            _userService = userService;
            _passwordService = passwordService;
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _userService.GetUserByUsername(dto.Username);

            if (user == null)
                return Unauthorized("Invalid credentials");

            if (!_passwordService.VerifyPassword(user, user.Password, dto.Password))
                return Unauthorized("Invalid credentials");

            var token = _passwordService.GenerateToken(user);

            return Ok(new { Token = token });
        }
    }
}
