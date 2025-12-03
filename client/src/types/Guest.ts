import type Invite from "@/pages/Invite";

export interface Guest {
    guestId: string;
    fullName: string;
    isAttending: boolean;
    inviteId: string;
}

export interface GuestDto {
    fullName: string;
    isAttending: boolean;
    inviteId: string;
}