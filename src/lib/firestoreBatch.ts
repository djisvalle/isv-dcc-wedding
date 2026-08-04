import { writeBatch, type WriteBatch } from 'firebase/firestore';
import { db } from './firebase';

const MAX_BATCH_SIZE = 500;

/**
 * `onFirstBatch`, if given, adds extra operation(s) to the very first chunk's
 * batch (e.g. updating a parent invite's `guest_ids` array) so that write
 * lands atomically together with that chunk instead of as a separate,
 * independently-failable top-level call. Callers passing `onFirstBatch`
 * should leave headroom in `chunkSize` (Firestore batches cap at 500 ops).
 */
export async function commitInChunks<T>(
  items: T[],
  applyOp: (item: T, batch: WriteBatch) => void,
  chunkSize: number = MAX_BATCH_SIZE,
  onFirstBatch?: (batch: WriteBatch) => void
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    if (i === 0) onFirstBatch?.(batch);
    for (const item of chunk) {
      applyOp(item, batch);
    }
    await batch.commit();
  }
}
