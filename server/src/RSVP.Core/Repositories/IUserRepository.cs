using RSVP.Core.Contracts.Auth;
using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Repositories
{
    public interface IUserRepository
    {
        Task<List<User>> GetUsers();
        Task<User?> GetUserByUserName(string username);
        Task CreateUser(User user);
    }
}
