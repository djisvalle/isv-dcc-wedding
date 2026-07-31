import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import type { WaitingGuest } from '../types';

interface WaitingListContextValue {
  waitingList: WaitingGuest[];
  loading: boolean;
}

const WaitingListContext = createContext<WaitingListContextValue>({ waitingList: [], loading: true });

export function WaitingListProvider({ children }: { children: ReactNode }) {
  const [waitingList, setWaitingList] = useState<WaitingGuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'waiting_list'),
      (snap) => {
        setWaitingList(snap.docs.map(d => ({ id: d.id, ...d.data() } as WaitingGuest)));
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'waiting_list');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return (
    <WaitingListContext.Provider value={{ waitingList, loading }}>
      {children}
    </WaitingListContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + its hook are intentionally co-located
export function useWaitingList() {
  return useContext(WaitingListContext);
}
