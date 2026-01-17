using RSVP.Application.DTOs.User;
using RSVP.Domain.Models;

namespace RSVP.Application.Interfaces
{
    public interface IUserService
    {
        Task<List<User>> GetUsers();
        Task<User?> GetUserByUsername(string username);
        Task CreateUser(CreateUserDto dto);
    }
}
