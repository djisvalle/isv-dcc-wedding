export interface Guest {
    guestId: string;
    fullName: string;
    isAttending: boolean | null;
    inviteId: string;
}

export interface CreateGuestPayload {
    fullName: string;
    inviteId?: string | null;
}

export interface UpdateGuestPayload {
    guestId: string;
    fullName: string;
    inviteId: string | null;
}

export interface GuestRsvp {
    guestId: string;
    fullName: string;
    isAttending: boolean | null;
    inviteName: string;
}