import { useQuery } from '@tanstack/react-query';
import { fetchDeadline, fetchInvite } from '../api/rsvpApi';

export function useDeadline() {
  return useQuery({
    queryKey: ['deadline'],
    queryFn: fetchDeadline,
    staleTime: 5 * 60 * 1000, // deadline changes rarely
  });
}

export function useRsvpInvite(inviteId: string | undefined) {
  const deadlineQuery = useDeadline();

  const inviteQuery = useQuery({
    queryKey: ['invite', inviteId],
    queryFn: () => fetchInvite(inviteId as string),
    enabled: !!inviteId,
    staleTime: 30 * 1000, // RSVP status should feel current
  });

  return {
    invite: inviteQuery.data?.invite ?? null,
    guests: inviteQuery.data?.guests ?? [],
    deadline: deadlineQuery.data?.date ?? null,
    isPastDeadline: deadlineQuery.data?.isPastDeadline ?? false,
    loading: inviteQuery.isLoading || deadlineQuery.isLoading,
    error: inviteQuery.error ?? deadlineQuery.error,
  };
}
