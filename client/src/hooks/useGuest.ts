import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { guestApi } from "../infrastracture/guestApi";
import type { Guest, GuestRsvp } from "../types/Guest";

export function useGetAllGuests() {
    return useQuery({
        queryKey: ['guests'],
        queryFn: guestApi.getAll,
        initialData: []
    })
}

export function useCreateGuest() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: guestApi.createGuest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guests'] });
        }
    })
}

export function useUpdateGuest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: guestApi.updateGuest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guests'] });
        }
    })
}

export function useGetGuestDropdown() {
    return useQuery({
        queryKey: ['guests-dropdown'],
        queryFn: guestApi.getGuestDropdown
    })
}

export function useGetGuestsByInviteForRsvp(inviteId: string | null) {
    return useQuery({
        queryKey: ['guests-by-invite-id'],
        queryFn: () => guestApi.getGuestsByInviteForRsvp(inviteId),
        enabled: !!inviteId,
        staleTime: Infinity,           // data never goes stale
        refetchOnWindowFocus: false,   // don't refetch when window gains focus
        refetchOnReconnect: false, 
    })
}

export function useConfirmGuestRsvp() {
    return useMutation({
        mutationFn: guestApi.getConfirmGuestRsvp,
        onSuccess: () => {}
    })
}