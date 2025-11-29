using RSVP.Core.Contracts.User;
using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Interfaces
{
    public interface IUserService
    {
        Task<List<User>> GetUsers();
        Task<User?> GetUserByUsername(string username);
        Task CreateUser(CreateUserDto dto);
    }
}
