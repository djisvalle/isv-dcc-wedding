import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import type { Invite } from '../types';

interface InvitesContextValue {
  invites: Invite[];
  loading: boolean;
}

const InvitesContext = createContext<InvitesContextValue>({ invites: [], loading: true });

export function InvitesProvider({ children }: { children: ReactNode }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'invites'),
      (snap) => {
        setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'invites');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return (
    <InvitesContext.Provider value={{ invites, loading }}>
      {children}
    </InvitesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + its hook are intentionally co-located
export function useInvites() {
  return useContext(InvitesContext);
}
