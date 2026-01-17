using RSVP.Application.DTOs.User;
using RSVP.Core.Interfaces;
using RSVP.Core.Models;
using RSVP.Core.Repositories;

namespace RSVP.Core.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _db;

        private readonly IPasswordService _passwordService;


        public UserService(IUserRepository db, IPasswordService passwordService)
        {
            _db = db;
            _passwordService = passwordService;
        }

        public async Task<List<User>> GetUsers() => await _db.GetUsers();

        public async Task<User?> GetUserByUsername(string username) => await _db.GetUserByUserName(username);

        public async Task CreateUser(CreateUserDto dto)
        {
            var user = new User
            {
                Username = dto.Username,
                Password = dto.Password,
                Role = dto.Role
            };

            var hashedPassword = _passwordService.HashPassword(user, dto.Password);
            user.Password = hashedPassword;

            await _db.CreateUser(user);
        }
    }
}
