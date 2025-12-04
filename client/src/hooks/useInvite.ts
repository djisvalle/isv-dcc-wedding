import { useQuery } from "@tanstack/react-query";
import { inviteApi } from "../infrastracture/inviteApi";

export function useInvite() {
    return useQuery({
        queryKey: ['invites'],
        queryFn: inviteApi.getAll,
        initialData: []
    })
}