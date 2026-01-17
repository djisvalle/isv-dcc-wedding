using RSVP.Domain.Models;

namespace RSVP.Application.Interfaces
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
