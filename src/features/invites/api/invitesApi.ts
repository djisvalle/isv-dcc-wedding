import { doc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';

export async function createInviteWithGuests(
  inviteId: string,
  inviteData: { name: string; import_order: number },
  guestNames: string[],
  role: string | null = null
): Promise<void> {
  const validNames = guestNames.filter(Boolean);
  const inviteRef = doc(db, 'invites', inviteId);

  if (validNames.length === 0) {
    const batch = writeBatch(db);
    batch.set(inviteRef, { ...inviteData, created_at: serverTimestamp() }, { merge: true });
    await batch.commit().catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `invites/${inviteId}`);
      throw err;
    });
    return;
  }

  // 499 guests per chunk leaves room for the invite write in the first batch.
  const GUEST_CHUNK = 499;
  let guestIndex = 0;
  for (let i = 0; i < validNames.length; i += GUEST_CHUNK) {
    const slice = validNames.slice(i, i + GUEST_CHUNK);
    const batch = writeBatch(db);
    if (i === 0) {
      batch.set(inviteRef, { ...inviteData, created_at: serverTimestamp() }, { merge: true });
    }
    for (const name of slice) {
      const guestRef = doc(collection(db, 'guests'));
      batch.set(guestRef, {
        name,
        invite_id: inviteId,
        role,
        is_coming: null,
        import_order: guestIndex++,
        updated_at: serverTimestamp()
      });
    }
    await batch.commit().catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `invites/${inviteId}`);
      throw err;
    });
  }
}

export async function deleteInviteAndUnassignGuests(inviteId: string): Promise<void> {
  const guestsQuery = query(collection(db, 'guests'), where('invite_id', '==', inviteId));
  const snap = await getDocs(guestsQuery).catch(err => {
    handleFirestoreError(err, OperationType.LIST, 'guests (filtered)');
    throw err;
  });

  const inviteRef = doc(db, 'invites', inviteId);

  if (snap.docs.length === 0) {
    const batch = writeBatch(db);
    batch.delete(inviteRef);
    await batch.commit().catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `invites/${inviteId}`);
      throw err;
    });
    return;
  }

  // 499 guests per chunk leaves room for the invite delete in the first batch.
  const GUEST_CHUNK = 499;
  for (let i = 0; i < snap.docs.length; i += GUEST_CHUNK) {
    const slice = snap.docs.slice(i, i + GUEST_CHUNK);
    const batch = writeBatch(db);
    if (i === 0) {
      batch.delete(inviteRef);
    }
    for (const guestDoc of slice) {
      batch.update(doc(db, 'guests', guestDoc.id), { invite_id: null });
    }
    await batch.commit().catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `invites/${inviteId}`);
      throw err;
    });
  }
}
