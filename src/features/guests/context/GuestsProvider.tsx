import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import type { Guest } from '../types';

interface GuestsContextValue {
  guests: Guest[];
  loading: boolean;
}

const GuestsContext = createContext<GuestsContextValue>({ guests: [], loading: true });

export function GuestsProvider({ children }: { children: ReactNode }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'guests'),
      (snap) => {
        setGuests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Guest)));
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'guests');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return (
    <GuestsContext.Provider value={{ guests, loading }}>
      {children}
    </GuestsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + its hook are intentionally co-located
export function useGuests() {
  return useContext(GuestsContext);
}
