import { writeBatch, type WriteBatch } from 'firebase/firestore';
import { db } from './firebase';

const MAX_BATCH_SIZE = 500;

export async function commitInChunks<T>(
  items: T[],
  applyOp: (item: T, batch: WriteBatch) => void,
  chunkSize: number = MAX_BATCH_SIZE
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      applyOp(item, batch);
    }
    await batch.commit();
  }
}
