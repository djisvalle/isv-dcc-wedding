import { doc, collection, serverTimestamp, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { commitInChunks } from '@/lib/firestoreBatch';

export interface DeletableGuest {
  id: string;
  invite_id?: string | null;
}

export async function batchDeleteGuests(guests: DeletableGuest[]): Promise<void> {
  if (guests.length === 0) return;
  await commitInChunks(guests, (guest, batch) => {
    batch.delete(doc(db, 'guests', guest.id));
  }).catch(err => {
    handleFirestoreError(err, OperationType.DELETE, 'guests/multiple');
    throw err;
  });

  const idsByInvite = new Map<string, string[]>();
  for (const guest of guests) {
    if (!guest.invite_id) continue;
    const ids = idsByInvite.get(guest.invite_id);
    if (ids) ids.push(guest.id);
    else idsByInvite.set(guest.invite_id, [guest.id]);
  }

  await Promise.all(
    Array.from(idsByInvite.entries()).map(([inviteId, ids]) =>
      updateDoc(doc(db, 'invites', inviteId), { guest_ids: arrayRemove(...ids) })
    )
  ).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, 'invites/multiple');
    throw err;
  });
}

export async function batchUpdateGuestStatus(ids: string[], status: boolean | null): Promise<void> {
  if (ids.length === 0) return;
  await commitInChunks(ids, (id, batch) => {
    batch.update(doc(db, 'guests', id), {
      is_coming: status,
      updated_at: serverTimestamp(),
      // A guest no longer marked attending shouldn't stay parked in a seat:
      // if they're later flipped back to attending, they'd otherwise
      // silently reappear at a table that may since be reassigned.
      ...(status !== true && { table_type: null, table_number: null, table_order: null }),
    });
  }).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, 'guests/multiple');
    throw err;
  });
}

export interface GuestImportRow {
  name: string;
  role?: string | null;
  invite_id?: string | null;
}

export async function batchImportGuests(rows: GuestImportRow[]): Promise<void> {
  if (rows.length === 0) return;

  // Refs are pre-generated (rather than created inside the batch callback)
  // so their IDs are known afterwards, to add them to their invite's
  // guest_ids array.
  const entries = rows.map((row, index) => ({
    row,
    ref: doc(collection(db, 'guests')),
    index,
  }));

  await commitInChunks(entries, ({ row, ref, index }, batch) => {
    batch.set(ref, {
      name: row.name,
      role: row.role || null,
      invite_id: row.invite_id || null,
      is_coming: null,
      import_order: index,
      updated_at: serverTimestamp()
    });
  }).catch(err => {
    handleFirestoreError(err, OperationType.CREATE, 'guests/bulk-import');
    throw err;
  });

  const idsByInvite = new Map<string, string[]>();
  for (const { row, ref } of entries) {
    if (!row.invite_id) continue;
    const ids = idsByInvite.get(row.invite_id);
    if (ids) ids.push(ref.id);
    else idsByInvite.set(row.invite_id, [ref.id]);
  }

  await Promise.all(
    Array.from(idsByInvite.entries()).map(([inviteId, ids]) =>
      updateDoc(doc(db, 'invites', inviteId), { guest_ids: arrayUnion(...ids) })
    )
  ).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, 'invites/multiple');
    throw err;
  });
}

