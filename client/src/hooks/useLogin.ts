import { useMutation } from "@tanstack/react-query";
import { authApi } from "../infrastracture/authApi";

export function useLogin(onSuccess?: (token: string) => void) {
    return useMutation({
        mutationFn: authApi.login,
        onSuccess: (data) => onSuccess?.(data.token),
    });
}