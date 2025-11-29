using Microsoft.AspNetCore.Identity;
using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using RSVP.Core.Configs;
using Microsoft.Extensions.Options;
using RSVP.Core.Interfaces;

namespace RSVP.Core.Services
{
    public class PasswordService : IPasswordService
    {
        private readonly JwtSettings _jwt;
        private readonly PasswordHasher<User> _passwordHasher = new();

        public PasswordService(IOptions<JwtSettings> options) => _jwt = options.Value;

        public string GenerateToken(User user)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                    issuer: _jwt.Issuer,
                    audience: _jwt.Audience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
                    signingCredentials: creds
                );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string HashPassword(User user, string password) => _passwordHasher.HashPassword(user, password);

        public bool VerifyPassword(User user, string hashedPassword, string providedPassword)
        {
            var result = _passwordHasher.VerifyHashedPassword(user, hashedPassword, providedPassword);
            return result == PasswordVerificationResult.Success;
        }

        public string GetKey() => _jwt.Key;

        public string GetIssuer() => _jwt.Issuer;

        public string GetAudience() => _jwt.Audience;
    }
}
