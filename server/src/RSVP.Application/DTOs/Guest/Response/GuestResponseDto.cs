namespace RSVP.Application.DTOs.Guest.Response
{
    public class GuestResponseDto
    {
        public Guid GuestId { get; set; }
        public required string FullName { get; set; }
        public bool? IsAttending { get; set; }
        public DateTime CreatedDateTime { get; set; }
        public Guid? InviteId { get; set; }
    }
}
