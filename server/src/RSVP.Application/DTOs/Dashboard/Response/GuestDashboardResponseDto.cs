namespace RSVP.Application.DTOs.Dashboard.Response
{
    public record GuestDashboardResponseDto
    {
        public Guid GuestId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string InviteName { get; set; } = string.Empty;
        public string IsAttending { get; set; } = string.Empty;
    }
}
