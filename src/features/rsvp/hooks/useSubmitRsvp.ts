import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitRsvp, type GuestStatusChange } from '../api/rsvpApi';

export function useSubmitRsvp(inviteId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: GuestStatusChange[]) => submitRsvp(changes),
    onSuccess: () => {
      if (inviteId) {
        queryClient.invalidateQueries({ queryKey: ['invite', inviteId] });
      }
    },
  });
}
