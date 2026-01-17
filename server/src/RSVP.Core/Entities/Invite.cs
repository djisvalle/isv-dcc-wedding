namespace RSVP.Domain.Entities
{
    public class Invite
    {
        public Guid InviteId { get; set; }
        public required string InviteName { get; set; }
        public List<Guest>? Guests { get; set; }
        public DateTime CreatedDateTime { get; set; }
    }
}
