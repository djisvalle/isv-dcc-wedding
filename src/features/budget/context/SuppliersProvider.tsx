import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import type { Supplier } from '../types';

interface SuppliersContextValue {
  suppliers: Supplier[];
  loading: boolean;
}

const SuppliersContext = createContext<SuppliersContextValue>({ suppliers: [], loading: true });

export function SuppliersProvider({ children }: { children: ReactNode }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'suppliers'),
      (snap) => {
        setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'suppliers');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return (
    <SuppliersContext.Provider value={{ suppliers, loading }}>
      {children}
    </SuppliersContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + its hook are intentionally co-located
export function useSuppliers() {
  return useContext(SuppliersContext);
}
