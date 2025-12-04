import { http } from "./http";
import type { Invite } from "../types/Invite";

export const inviteApi = {
    getAll: async () => {
        const res = await http.get<Invite[]>("/invite");
        return res.data;
    }
}