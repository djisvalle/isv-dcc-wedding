namespace RSVP.Application.DTOs.Guest.Response
{
    public class GuestDropdownResponseDto
    {
        public Guid GuestId { get; set; }
        public required string FullName { get; set; }
    }
}
