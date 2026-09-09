import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Used until an admin saves a custom list under settings/guest_roles, so
// existing sites keep working with no migration step.
export const DEFAULT_GUEST_ROLES = [
  'Groom',
  'Bride',
  'Mother of the Groom',
  'Father of the Bride',
  'Mother of the Bride',
  'Principal Sponsor',
  'Secondary Sponsor',
  'Best Man',
  'Maid of Honor',
  'Groomsman',
  'Bridesmaid'
];

export function useGuestRoles() {
  const [roles, setRoles] = useState<string[]>(DEFAULT_GUEST_ROLES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'guest_roles'), (snap) => {
      const value = snap.exists() ? snap.data().value : null;
      setRoles(Array.isArray(value) && value.length > 0 ? value : DEFAULT_GUEST_ROLES);
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { roles, loading };
}
