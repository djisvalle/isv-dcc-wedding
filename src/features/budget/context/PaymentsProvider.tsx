import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import type { Payment } from '../types';

interface PaymentsContextValue {
  payments: Payment[];
  loading: boolean;
}

const PaymentsContext = createContext<PaymentsContextValue>({ payments: [], loading: true });

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'payments'),
      (snap) => {
        setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'payments');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return (
    <PaymentsContext.Provider value={{ payments, loading }}>
      {children}
    </PaymentsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + its hook are intentionally co-located
export function usePayments() {
  return useContext(PaymentsContext);
}
