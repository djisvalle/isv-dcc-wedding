import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import type { Guest } from '@/features/guests/types';
import type { Invite } from '../types';

/**
 * Public RSVP reads fetch a group's guests via `invite.guest_ids` instead of a
 * `list` query (Firestore rules no longer allow public `list` on `guests`).
 * Invites created before that change don't have `guest_ids` populated, and any
 * write path that forgets to maintain it would silently break those invites'
 * RSVP links. Since only admins can `list` guests, this repairs drift the next
 * time an admin session has both collections loaded.
 */
export function useReconcileGuestIds(guests: Guest[], invites: Invite[], ready: boolean) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!ready || ranRef.current) return;
    ranRef.current = true;

    const computed = new Map<string, string[]>();
    for (const guest of guests) {
      if (!guest.invite_id) continue;
      const ids = computed.get(guest.invite_id);
      if (ids) ids.push(guest.id);
      else computed.set(guest.invite_id, [guest.id]);
    }

    const mismatched = invites.filter(invite => {
      const expected = computed.get(invite.id) ?? [];
      const actual = invite.guest_ids ?? [];
      return expected.length !== actual.length || expected.some(id => !actual.includes(id));
    });

    if (mismatched.length === 0) return;

    for (const invite of mismatched) {
      updateDoc(doc(db, 'invites', invite.id), {
        guest_ids: computed.get(invite.id) ?? [],
      }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `invites/${invite.id}`);
      });
    }
  }, [guests, invites, ready]);
}
