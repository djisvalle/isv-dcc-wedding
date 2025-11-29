using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RSVP.Core.Configs;
using RSVP.Core.Contracts.User;
using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RSVP.Core.Interfaces
{
    public interface IPasswordService
    {
        string GenerateToken(User user);
        string HashPassword(User user, string password);
        bool VerifyPassword(User user, string hashedPassword, string providedPassword);
        string GetKey();
        string GetIssuer();
        string GetAudience();
    }
}
