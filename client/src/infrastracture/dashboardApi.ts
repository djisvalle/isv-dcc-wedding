import { http } from "./http";
import type { GuestDashboard, InviteDashboard } from "../types/Dashboard";

export const dashboardApi = {
    getGuestDashboard: async () => {
        const res = await http.get<GuestDashboard[]>("/dashboard/guest");
        return res.data;
    },
    getInviteDashboard: async () => {
        const res = await http.get<InviteDashboard[]>("/dashboard/invite");
        return res.data;
    }
}