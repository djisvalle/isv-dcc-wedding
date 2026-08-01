import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '@/lib/firebase';
import type { Guest, Invite, RsvpDeadline } from '../types';

export async function fetchDeadline(): Promise<RsvpDeadline> {
  const deadlineRef = doc(db, 'settings', 'rsvp_deadline');
  const snap = await getDoc(deadlineRef).catch(err => {
    handleFirestoreError(err, OperationType.GET, 'settings/rsvp_deadline');
    throw err;
  });

  if (!snap.exists() || !snap.data().value) {
    return { date: null, isPastDeadline: false };
  }

  const value = snap.data().value;
  // Pre-migration deadlines were stored as a raw datetime-local string;
  // new ones are a real Timestamp so Firestore rules can enforce them too.
  const date = value instanceof Timestamp ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) {
    return { date: null, isPastDeadline: false };
  }

  return { date, isPastDeadline: date < new Date() };
}

export interface InviteWithGuests {
  invite: Invite;
  guests: Guest[];
}

export async function fetchInvite(inviteId: string): Promise<InviteWithGuests> {
  const inviteRef = doc(db, 'invites', inviteId);
  const inviteSnap = await getDoc(inviteRef).catch(err => {
    handleFirestoreError(err, OperationType.GET, `invites/${inviteId}`);
    throw err;
  });

  if (inviteSnap.exists()) {
    const invite = { id: inviteSnap.id, ...inviteSnap.data() } as Invite;
    const guestIds = (inviteSnap.data().guest_ids as string[] | undefined) ?? [];

    // Guests are fetched by ID (one `get` per guest) rather than a `list`
    // query: Firestore rules restrict `list` on `guests` to admins so the
    // collection can't be scraped, but per-doc `get` stays open.
    const guestSnaps = await Promise.all(
      guestIds.map(id => getDoc(doc(db, 'guests', id)))
    ).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'guests (by invite.guest_ids)');
      throw err;
    });

    const guests = guestSnaps
      .filter(snap => snap.exists())
      .map(snap => ({ id: snap.id, ...snap.data() } as Guest))
      .sort((a, b) => (a.import_order ?? 0) - (b.import_order ?? 0));

    return { invite, guests };
  }

  // Fallback: inviteId might be an individual guest's own document id
  const guestRef = doc(db, 'guests', inviteId);
  const guestSnap = await getDoc(guestRef).catch(err => {
    handleFirestoreError(err, OperationType.GET, `guests/${inviteId}`);
    throw err;
  });

  if (!guestSnap.exists()) {
    throw new Error('Invite not found');
  }

  const guest = { id: guestSnap.id, ...guestSnap.data() } as Guest;
  const invite: Invite = { id: guest.id, name: guest.name, nickname: guest.nickname };
  return { invite, guests: [guest] };
}

export interface GuestStatusChange {
  id: string;
  is_coming: boolean | null;
}

export async function submitRsvp(changes: GuestStatusChange[]): Promise<void> {
  if (changes.length === 0) return;

  const batch = writeBatch(db);
  for (const change of changes) {
    batch.update(doc(db, 'guests', change.id), {
      is_coming: change.is_coming,
      updated_at: serverTimestamp(),
    });
  }

  await batch.commit().catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, 'guests/multiple');
    throw err;
  });
}
