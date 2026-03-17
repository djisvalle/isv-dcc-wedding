namespace RSVP.Application.DTOs.Guest.Response
{
    public record GuestDropdownResponseDto
    {
        public Guid GuestId { get; set; }
        public required string FullName { get; set; }
    }
}
