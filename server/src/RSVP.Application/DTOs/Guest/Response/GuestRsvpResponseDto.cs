namespace RSVP.Application.DTOs.Guest.Response
{
    public record GuestRsvpResponseDto
    {
        public Guid GuestId { get; set; }
        public required string FullName { get; set; }
        public bool IsAttending { get; set; }
        public string InviteName { get; set; } = string.Empty;
    }
}
