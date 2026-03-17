using RSVP.Domain.Entities;

namespace RSVP.Domain.Repositories
{
    public interface IUserRepository
    {
        Task<List<User>> GetUsers();
        Task<User?> GetUserByUserName(string username);
        Task CreateUser(User user);
    }
}
