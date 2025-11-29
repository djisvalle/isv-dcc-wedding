using RSVP.Core.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace RSVP.Core.Repositories
{
    public interface IGuestRepository
    {
        Task CreateGuest(Guest guest);
        Task<List<Guest>> GetGuests();
    }
}
