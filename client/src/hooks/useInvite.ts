import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { inviteApi } from "../infrastracture/inviteApi";

export function useGetAllInvites() {
    return useQuery({
        queryKey: ['invites'],
        queryFn: inviteApi.getAll,
        initialData: []
    })
}

export function useCreateInvite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: inviteApi.createInvite,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invites'] });
        }
    })
}

export function useUpdateInvite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: inviteApi.updateInvite,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invites'] });
        }
    })
}