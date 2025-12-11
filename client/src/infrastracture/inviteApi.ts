import { http } from "./http";
import type { Invite, CreateInvitePayload, UpdateInvitePayload } from "../types/Invite";

export const inviteApi = {
    getAll: async () => {
        const res = await http.get<Invite[]>("/invite");
        return res.data;
    },
    
    createInvite: async (invite: CreateInvitePayload) => {
        const res = await http.post("/invite", invite);
        return res.data;
    },

    updateInvite: async (invite: UpdateInvitePayload) => {
        const res = await http.put(`/invite/${invite.inviteId}`, invite);
        return res.data;
    },
}