using RSVP.Application.DTOs.User;
using RSVP.Application.Interfaces;
using RSVP.Domain.Entities;
using RSVP.Domain.Repositories;

namespace RSVP.Application.Services
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
