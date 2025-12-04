import { http } from "./http";
import type { CreateGuestPayload, UpdateGuestPayload, Guest } from "../types/Guest";

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
    }
}