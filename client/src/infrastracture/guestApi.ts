import { http } from "./http";
import type { Guest } from "../types/Guest";

export const guestApi = {
    getAll: async () => {
        const res = await http.get<Guest[]>("/guest");
        return res.data;
    }
}