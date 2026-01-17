namespace RSVP.Application.DTOs.Dashboard.Response
{
    public class InviteDashboardResponseDto
    {
        public Guid InviteId { get; set; }
        public string InviteName { get; set; } = string.Empty;
        public string InviteUrl { get; set; } = string.Empty;
        public int GuestCount { get; set; } = 0;
    }
}
