import type { Guest, CreateGuestPayload } from "./Guest";

export interface Invite {
    inviteId: string;
    inviteName: string;
    guests: Guest[] | null;
}

export interface CreateInvitePayload {
    inviteName: string;
    guests: CreateGuestPayload[] | null;
    guestIds: string[] | null;
}

export interface UpdateInvitePayload {
    inviteId: string;
    inviteName: string;
    guests: CreateGuestPayload[] | null;
    guestIds: string[] | null;
}