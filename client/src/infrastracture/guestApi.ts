import { http } from "./http";
import type { CreateGuestPayload, UpdateGuestPayload, Guest, GuestRsvp } from "../types/Guest";
import type { KeyValuePair } from "../types/KeyValuePair";

export const guestApi = {
    getAll: async () => {
        const res = await http.get<Guest[]>("/guest");
        return res.data;
    },

    createGuest: async (guest: CreateGuestPayload) => {
        const res = await http.post("/guest", guest);
        return res.data;
    },

    updateGuest: async (guest: UpdateGuestPayload) => {
        var guestId = guest.guestId;
        const res = await http.put(`/guest/${guestId}`, guest);
        return res.data;
    },

    getGuestDropdown: async () => {
        const res = await http.get<Guest[]>("/guest/guest-dropdown");
        return res.data.map((guest: Guest): KeyValuePair => ({ key: guest.guestId, value: guest.fullName }));  
    },

    getGuestsByInviteForRsvp: async (inviteId: string | null) => {
        const res = await http.get<GuestRsvp[]>(`/guest/get-by-invite/${inviteId}`);
        return res.data;
    },

    getConfirmGuestRsvp: async (comfirmedGuests: GuestRsvp[]) => {
        const res = await http.patch("/guest/confirm-guest-rsvp", comfirmedGuests);
        return res.data;
    }
}