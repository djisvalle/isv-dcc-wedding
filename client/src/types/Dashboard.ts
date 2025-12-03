export interface GuestDashboard {
    guestId: string;    
    fullName: string;
    inviteName: string;
    inviteUrl: string;
    isAttending: string;
}

export interface InviteDashboard {
    inviteId: string;    
    inviteName: string;
    inviteUrl: string;
    guestCount: number;
}