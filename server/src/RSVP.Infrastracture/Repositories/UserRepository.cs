using Microsoft.EntityFrameworkCore;
using RSVP.Domain.Entities;
using RSVP.Domain.Repositories;

namespace RSVP.Infrastracture.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly RsvpDbContext _context;

        public UserRepository(RsvpDbContext context) => _context = context;

        public async Task<List<User>> GetUsers() => await _context.Users.ToListAsync();

        public async Task<User?> GetUserByUserName(string username) => await _context.Users.FirstOrDefaultAsync(x => x.Username == username);

        public async Task CreateUser(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
        }
    }
}
