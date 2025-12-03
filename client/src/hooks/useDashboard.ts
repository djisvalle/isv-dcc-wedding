import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../infrastracture/dashboardApi";

export function useGuestDashboard() {
    return useQuery({
        queryKey: ['dashboard-guest'],
        queryFn: dashboardApi.getGuestDashboard,
        staleTime: 600000
    })
}

export function useInviteDashboard() {
    return useQuery({
        queryKey: ['dashboard-invite'],
        queryFn: dashboardApi.getInviteDashboard,
        staleTime: 600000
    })
}