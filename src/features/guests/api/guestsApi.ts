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
  sex?: string | null;
  invite_id?: string | null;
}

export interface ExistingGuestForImport {
  id: string;
  name: string;
  invite_id?: string | null;
}

export interface GuestImportResult {
  created: number;
  updated: number;
  // Names that matched more than one existing guest, so were left untouched
  // rather than guessing which one to update.
  skippedDuplicates: string[];
}

type ImportOp =
  | { type: 'create'; row: GuestImportRow; ref: ReturnType<typeof doc>; index: number }
  | { type: 'update'; row: GuestImportRow; existing: ExistingGuestForImport };

const normalizeName = (name: string) => name.trim().toLowerCase();

export async function batchImportGuests(
  rows: GuestImportRow[],
  existingGuests: ExistingGuestForImport[]
): Promise<GuestImportResult> {
  if (rows.length === 0) return { created: 0, updated: 0, skippedDuplicates: [] };

  const existingByName = new Map<string, ExistingGuestForImport[]>();
  for (const guest of existingGuests) {
    const key = normalizeName(guest.name);
    const matches = existingByName.get(key);
    if (matches) matches.push(guest);
    else existingByName.set(key, [guest]);
  }

  const ops: ImportOp[] = [];
  const skippedDuplicates: string[] = [];

  rows.forEach((row, index) => {
    const matches = existingByName.get(normalizeName(row.name));
    if (!matches) {
      // Ref is pre-generated (rather than created inside the batch callback)
      // so its ID is known afterwards, to add it to its invite's guest_ids array.
      ops.push({ type: 'create', row, ref: doc(collection(db, 'guests')), index });
    } else if (matches.length === 1) {
      ops.push({ type: 'update', row, existing: matches[0] });
    } else {
      skippedDuplicates.push(row.name);
    }
  });

  await commitInChunks(ops, (op, batch) => {
    if (op.type === 'create') {
      batch.set(op.ref, {
        name: op.row.name,
        role: op.row.role || null,
        sex: op.row.sex || null,
        invite_id: op.row.invite_id || null,
        is_coming: null,
        import_order: op.index,
        updated_at: serverTimestamp()
      });
    } else {
      // RSVP status, table assignment, and import_order are intentionally
      // left untouched so a re-upload can't silently un-seat or un-RSVP
      // someone who was already recorded.
      batch.update(doc(db, 'guests', op.existing.id), {
        name: op.row.name,
        role: op.row.role || null,
        sex: op.row.sex || null,
        invite_id: op.row.invite_id || null,
        updated_at: serverTimestamp()
      });
    }
  }).catch(err => {
    handleFirestoreError(err, OperationType.CREATE, 'guests/bulk-import');
    throw err;
  });

  // Split into a removals pass and an additions pass: a single invite could
  // need both (e.g. two guests swap invites in the same upload), and one
  // updateDoc call can't apply arrayRemove and arrayUnion to the same field.
  const removalsByInvite = new Map<string, string[]>();
  const additionsByInvite = new Map<string, string[]>();
  const addTo = (map: Map<string, string[]>, inviteId: string, guestId: string) => {
    const ids = map.get(inviteId);
    if (ids) ids.push(guestId);
    else map.set(inviteId, [guestId]);
  };

  let created = 0;
  let updated = 0;
  for (const op of ops) {
    if (op.type === 'create') {
      created++;
      if (op.row.invite_id) addTo(additionsByInvite, op.row.invite_id, op.ref.id);
    } else {
      updated++;
      const newInviteId = op.row.invite_id || null;
      const oldInviteId = op.existing.invite_id || null;
      if (newInviteId === oldInviteId) continue;
      if (oldInviteId) addTo(removalsByInvite, oldInviteId, op.existing.id);
      if (newInviteId) addTo(additionsByInvite, newInviteId, op.existing.id);
    }
  }

  await Promise.all(
    Array.from(removalsByInvite.entries()).map(([inviteId, ids]) =>
      updateDoc(doc(db, 'invites', inviteId), { guest_ids: arrayRemove(...ids) })
    )
  ).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, 'invites/multiple');
    throw err;
  });

  await Promise.all(
    Array.from(additionsByInvite.entries()).map(([inviteId, ids]) =>
      updateDoc(doc(db, 'invites', inviteId), { guest_ids: arrayUnion(...ids) })
    )
  ).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, 'invites/multiple');
    throw err;
  });

  return { created, updated, skippedDuplicates };
}

