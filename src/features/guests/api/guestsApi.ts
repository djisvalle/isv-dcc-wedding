import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { commitInChunks } from '@/lib/firestoreBatch';

export async function batchDeleteGuests(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await commitInChunks(ids, (id, batch) => {
    batch.delete(doc(db, 'guests', id));
  }).catch(err => {
    handleFirestoreError(err, OperationType.DELETE, 'guests/multiple');
    throw err;
  });
}

export async function batchUpdateGuestStatus(ids: string[], status: boolean | null): Promise<void> {
  if (ids.length === 0) return;
  await commitInChunks(ids, (id, batch) => {
    batch.update(doc(db, 'guests', id), { is_coming: status, updated_at: serverTimestamp() });
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
  let index = 0;
  await commitInChunks(rows, (row, batch) => {
    const ref = doc(collection(db, 'guests'));
    batch.set(ref, {
      name: row.name,
      role: row.role || null,
      invite_id: row.invite_id || null,
      is_coming: null,
      import_order: index++,
      updated_at: serverTimestamp()
    });
  }).catch(err => {
    handleFirestoreError(err, OperationType.CREATE, 'guests/bulk-import');
    throw err;
  });
}

