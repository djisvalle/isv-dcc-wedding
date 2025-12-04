import { useQuery, useMutation } from "@tanstack/react-query";
import { guestApi } from "../infrastracture/guestApi";
import { useQueryClient } from "@tanstack/react-query";

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