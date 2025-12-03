import { useQuery } from "@tanstack/react-query";
import { guestApi } from "../infrastracture/guestApi";

export function useGuest() {
    return useQuery({
        queryKey: ['guests'],
        queryFn: guestApi.getAll,
        initialData: []
    })
}