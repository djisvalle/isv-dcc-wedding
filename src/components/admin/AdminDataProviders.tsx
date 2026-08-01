import { Outlet } from 'react-router-dom';
import { GuestsProvider, useGuests } from '@/features/guests/context/GuestsProvider';
import { InvitesProvider, useInvites } from '@/features/invites/context/InvitesProvider';
import { useReconcileGuestIds } from '@/features/invites/hooks/useReconcileGuestIds';

function GuestIdsReconciler() {
  const { guests, loading: guestsLoading } = useGuests();
  const { invites, loading: invitesLoading } = useInvites();
  useReconcileGuestIds(guests, invites, !guestsLoading && !invitesLoading);
  return null;
}

/**
 * Pathless layout route mounted only around the admin pages that actually
 * read guests/invites (Dashboard, Invitations, Guest List, Tables) — Settings
 * doesn't touch either collection, so it shouldn't hold open a realtime
 * listener on the full guest list. Mounting these providers once here (rather
 * than per-page) keeps a single shared subscription/cache across those four
 * pages, so switching between them doesn't re-fetch.
 */
export default function AdminDataProviders() {
  return (
    <GuestsProvider>
      <InvitesProvider>
        <GuestIdsReconciler />
        <Outlet />
      </InvitesProvider>
    </GuestsProvider>
  );
}
