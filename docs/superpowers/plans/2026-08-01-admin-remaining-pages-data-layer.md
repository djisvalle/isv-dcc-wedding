# Admin Remaining Pages Data Layer (2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `AdminDashboard`, `AdminBudget`, `AdminReports`, `AdminTables`, and `AdminWaitingList` the same shared-context, batched-write, memoized data layer that sub-project 2a already gave `AdminGuests`/`AdminInvites`.

**Architecture:** Three new React Contexts (`SuppliersProvider`, `PaymentsProvider`, `WaitingListProvider`), each wrapping a single Firestore `onSnapshot`, mounted in `AdminLayout` alongside the existing `GuestsProvider`/`InvitesProvider`. Every page that redundantly re-subscribes to a collection another provider already owns switches to consuming that provider's hook instead. One N+1 write (`AdminTables`' drag-and-drop reorder) becomes a single `writeBatch`. Derived/filtered/sorted values move into `useMemo`; row/card sub-components that render in a list get `React.memo`.

**Tech Stack:** React 18, TypeScript, Firebase v10 Firestore (`onSnapshot`, `writeBatch`), Vite.

## Global Constraints

- No UI/visual changes to any of the 5 pages — this is a data-layer-only pass.
- Single-document CRUD (add/edit/delete one supplier, one payment, one waiting-list entry, `handleQuickMove`'s single guest update) stays a direct `updateDoc`/`addDoc`/`deleteDoc`/`setDoc` call in the component — do not route it through a batch helper. Only `AdminTables.handleDragEnd`'s multi-guest reorder gets batched.
- Every new provider follows the exact shape of `src/features/guests/context/GuestsProvider.tsx`: `{ items: T[], loading: boolean }`, `setLoading(false)` in both the success callback and the `onSnapshot` error callback.
- Manual verification only: `npx tsc --noEmit` and `npm run build` are the test signal for every task. No test runner is introduced.
- Match the codebase's existing `react-refresh/only-export-components` handling: any new file that exports both a Provider component and its `useX` hook needs the same `// eslint-disable-next-line react-refresh/only-export-components -- Provider + its hook are intentionally co-located` comment already used in `GuestsProvider.tsx`/`InvitesProvider.tsx`.
- `npx eslint . --report-unused-disable-directives --max-warnings 0` (the `npm run lint` script) must pass with zero warnings on every task's diff — the eslint config is fully live as of the immediately preceding branch work; do not introduce new unused imports/vars.

---

### Task 1: Shared type additions

**Files:**
- Modify: `src/features/guests/types.ts`
- Create: `src/features/budget/types.ts`
- Create: `src/features/waitingList/types.ts`

**Interfaces:**
- Produces: `Guest.table_order?: number` (extends the existing exported `Guest` interface). `Supplier` and `Payment` interfaces from `src/features/budget/types.ts`. `WaitingGuest` interface from `src/features/waitingList/types.ts`.

- [ ] **Step 1: Add `table_order` to the shared `Guest` type**

In `src/features/guests/types.ts`, the current interface is:

```ts
export interface Guest {
  id: string;
  name: string;
  nickname?: string;
  role: string | null;
  invite_id: string | null;
  is_coming: boolean | null;
  updated_at: any;
  table_type?: TableType;
  table_number?: string;
  import_order?: number;
  is_baby_or_child?: boolean;
  parent_name?: string;
}
```

Add a `table_order` field after `table_number`, so it reads:

```ts
export interface Guest {
  id: string;
  name: string;
  nickname?: string;
  role: string | null;
  invite_id: string | null;
  is_coming: boolean | null;
  updated_at: any;
  table_type?: TableType;
  table_number?: string;
  table_order?: number;
  import_order?: number;
  is_baby_or_child?: boolean;
  parent_name?: string;
}
```

This field is used by `AdminTables.tsx` (Task 8) to persist drag-and-drop
order within a table. It doesn't exist on the shared type yet because
`AdminTables.tsx` currently maintains its own narrower local `Guest`
interface instead of importing the shared one.

- [ ] **Step 2: Create `src/features/budget/types.ts`**

```ts
export interface Supplier {
  id: string;
  name: string;
  type: string;
  budget: number;
  created_at: any;
}

export interface Payment {
  id: string;
  supplier_id: string;
  amount: number;
  date: string;
  remarks: string;
  status: 'paid' | 'scheduled';
  created_at: any;
}
```

These are copied verbatim from the local `interface Supplier`/`interface
Payment` currently declared inside `src/pages/admin/AdminBudget.tsx` —
Task 6 deletes those local declarations and imports from here instead.

- [ ] **Step 3: Create `src/features/waitingList/types.ts`**

```ts
export interface WaitingGuest {
  id: string;
  name: string;
  role: string;
  notes: string;
  priority: number;
  created_at: any;
}
```

Copied verbatim from the local `interface WaitingGuest` currently declared
inside `src/pages/admin/AdminWaitingList.tsx` — Task 9 deletes that local
declaration and imports from here instead.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (these are pure additive type files; nothing consumes
them yet).

- [ ] **Step 5: Commit**

```bash
git add src/features/guests/types.ts src/features/budget/types.ts src/features/waitingList/types.ts
git commit -m "feat: add table_order to Guest type, add budget and waitingList shared types"
```

---

### Task 2: SuppliersProvider and PaymentsProvider

**Files:**
- Create: `src/features/budget/context/SuppliersProvider.tsx`
- Create: `src/features/budget/context/PaymentsProvider.tsx`

**Interfaces:**
- Consumes: `Supplier`, `Payment` from `src/features/budget/types.ts` (Task 1).
- Produces: `SuppliersProvider` component + `useSuppliers(): { suppliers: Supplier[], loading: boolean }`. `PaymentsProvider` component + `usePayments(): { payments: Payment[], loading: boolean }`.

- [ ] **Step 1: Create `src/features/budget/context/SuppliersProvider.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/features/budget/context/PaymentsProvider.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. Run: `npx eslint src/features/budget --report-unused-disable-directives --max-warnings 0`
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add src/features/budget/context/SuppliersProvider.tsx src/features/budget/context/PaymentsProvider.tsx
git commit -m "feat: add SuppliersProvider and PaymentsProvider shared real-time contexts"
```

---

### Task 3: WaitingListProvider

**Files:**
- Create: `src/features/waitingList/context/WaitingListProvider.tsx`

**Interfaces:**
- Consumes: `WaitingGuest` from `src/features/waitingList/types.ts` (Task 1).
- Produces: `WaitingListProvider` component + `useWaitingList(): { waitingList: WaitingGuest[], loading: boolean }`.

- [ ] **Step 1: Create `src/features/waitingList/context/WaitingListProvider.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. Run: `npx eslint src/features/waitingList --report-unused-disable-directives --max-warnings 0`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/features/waitingList/context/WaitingListProvider.tsx
git commit -m "feat: add WaitingListProvider shared real-time context"
```

---

### Task 4: Wire the three new providers into AdminLayout

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: `SuppliersProvider` (Task 2), `PaymentsProvider` (Task 2), `WaitingListProvider` (Task 3).

This task is purely additive — nothing consumes `useSuppliers()`/
`usePayments()`/`useWaitingList()` yet (that happens in Tasks 5-9), so
wrapping `<Outlet/>` with the new providers cannot break anything that
exists today.

- [ ] **Step 1: Add the three new imports**

In `src/components/admin/AdminLayout.tsx`, the current import block ends
with:

```tsx
import { GuestsProvider } from '@/features/guests/context/GuestsProvider';
import { InvitesProvider } from '@/features/invites/context/InvitesProvider';
```

Add three more lines after it:

```tsx
import { GuestsProvider } from '@/features/guests/context/GuestsProvider';
import { InvitesProvider } from '@/features/invites/context/InvitesProvider';
import { SuppliersProvider } from '@/features/budget/context/SuppliersProvider';
import { PaymentsProvider } from '@/features/budget/context/PaymentsProvider';
import { WaitingListProvider } from '@/features/waitingList/context/WaitingListProvider';
```

- [ ] **Step 2: Wrap the existing provider nesting with the three new ones**

The current JSX (inside `<main>`) is:

```tsx
        <GuestsProvider>
          <InvitesProvider>
            <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-wedding-gold mx-auto mt-20" />}>
              <motion.div
                 key={location.pathname}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.3 }}
              >
                <Outlet />
              </motion.div>
            </Suspense>
          </InvitesProvider>
        </GuestsProvider>
```

Replace it with:

```tsx
        <GuestsProvider>
          <InvitesProvider>
            <SuppliersProvider>
              <PaymentsProvider>
                <WaitingListProvider>
                  <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-wedding-gold mx-auto mt-20" />}>
                    <motion.div
                       key={location.pathname}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ duration: 0.3 }}
                    >
                      <Outlet />
                    </motion.div>
                  </Suspense>
                </WaitingListProvider>
              </PaymentsProvider>
            </SuppliersProvider>
          </InvitesProvider>
        </GuestsProvider>
```

The new providers stay outside the keyed `motion.div`, matching the
sub-project 2a fix for `GuestsProvider`/`InvitesProvider` — a provider
inside a `key={location.pathname}`-ed element would remount (and
re-subscribe its `onSnapshot`) on every admin route change.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: succeeds. This is the first task where the new providers are
actually mounted at runtime, so a full build (not just `tsc`) confirms
the provider tree doesn't break Vite's module graph.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminLayout.tsx
git commit -m "feat: mount SuppliersProvider, PaymentsProvider, WaitingListProvider in AdminLayout"
```

---

### Task 5: Migrate AdminDashboard off polling onto shared contexts

**Files:**
- Modify: `src/pages/admin/AdminDashboard.tsx`

**Interfaces:**
- Consumes: `useGuests()` from `src/features/guests/context/GuestsProvider.tsx`, `useInvites()` from `src/features/invites/context/InvitesProvider.tsx`.

- [ ] **Step 1: Replace the whole file**

Current `src/pages/admin/AdminDashboard.tsx` polls `getCountFromServer`
every 30 seconds. Replace its entire contents with:

```tsx
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Users, Ticket, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGuests } from '@/features/guests/context/GuestsProvider';
import { useInvites } from '@/features/invites/context/InvitesProvider';

export default function AdminDashboard() {
  const { guests, loading: guestsLoading } = useGuests();
  const { invites, loading: invitesLoading } = useInvites();

  const stats = useMemo(() => {
    const countedGuests = guests.filter(g => !g.is_baby_or_child);
    return {
      totalInvites: invites.length,
      totalGuests: countedGuests.length,
      attendingGuests: countedGuests.filter(g => g.is_coming === true).length,
      declinedGuests: countedGuests.filter(g => g.is_coming === false).length,
      pendingGuests: countedGuests.filter(g => g.is_coming === null).length,
    };
  }, [guests, invites]);

  if (guestsLoading || invitesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Guests', value: stats.totalGuests, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Attending', value: stats.attendingGuests, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Declined', value: stats.declinedGuests, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'No RSVP Yet', value: stats.pendingGuests, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Invites Sent', value: stats.totalInvites, icon: Ticket, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-serif mb-2">Overview</h1>
        <p className="text-slate-500">Real-time tracking of Israel & Deborah's wedding guest list.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className={`w-12 h-12 ${card.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div className="text-3xl font-bold text-slate-800">{card.value}</div>
                <div className="text-sm font-medium text-slate-400 uppercase tracking-wider mt-1">{card.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif">RSVP Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${stats.totalGuests > 0 ? (stats.attendingGuests / stats.totalGuests) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-rose-500"
                style={{ width: `${stats.totalGuests > 0 ? (stats.declinedGuests / stats.totalGuests) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-4 text-xs font-semibold text-slate-400">
              <span>{stats.totalGuests > 0 ? Math.round((stats.attendingGuests / stats.totalGuests) * 100) : 0}% Attending</span>
              <span>{stats.totalGuests > 0 ? Math.round((stats.declinedGuests / stats.totalGuests) * 100) : 0}% Declined</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

Note the `stats.totalGuests > 0 ? ... : 0` guards on the two percentage
computations: the original code's `getCountFromServer` calls only ever
resolved once guests existed in practice, so `stats.totalGuests` was
never `0` at render time. The new `useMemo` derivation can legitimately
render with `guests = []` transiently (e.g. immediately after
`GuestsProvider` mounts, before its `loading` flag flips to `false` — the
loading gate above already covers that — but also for a wedding with
zero guests currently in the database), so this guards against a
`0/0 = NaN` render.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/pages/admin/AdminDashboard.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminDashboard.tsx
git commit -m "perf: derive AdminDashboard stats from shared contexts instead of 30s polling"
```

---

### Task 6: Migrate AdminBudget onto SuppliersProvider/PaymentsProvider

**Files:**
- Modify: `src/pages/admin/AdminBudget.tsx`

**Interfaces:**
- Consumes: `useSuppliers()`, `usePayments()` (Task 2), `Supplier`/`Payment` types from `src/features/budget/types.ts` (Task 1).

- [ ] **Step 1: Replace the import block**

Current imports (top of file):

```tsx
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit2,
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  PhilippinePeso,
  LayoutGrid
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Supplier {
  id: string;
  name: string;
  type: string;
  budget: number;
  created_at: any;
}

interface Payment {
  id: string;
  supplier_id: string;
  amount: number;
  date: string;
  remarks: string;
  status: 'paid' | 'scheduled';
  created_at: any;
}
```

Replace it with:

```tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit2,
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  PhilippinePeso,
  LayoutGrid
} from 'lucide-react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSuppliers } from '@/features/budget/context/SuppliersProvider';
import { usePayments } from '@/features/budget/context/PaymentsProvider';
import type { Supplier, Payment } from '@/features/budget/types';
```

(`onSnapshot` is dropped — no longer used directly in this file. `collection`
stays — still used by `addDoc(collection(db, 'suppliers'), ...)` and
`addDoc(collection(db, 'payments'), ...)` inside the save handlers.)

- [ ] **Step 2: Replace state declarations and the data-fetching effect**

Current (top of the component body):

```tsx
export default function AdminBudget() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
```

...through the effect...

```tsx
  useEffect(() => {
    // Fetch Settings (Total Budget)
    const fetchBudget = async () => {
      const budgetDoc = await getDoc(doc(db, 'settings', 'total_budget'));
      if (budgetDoc.exists()) {
        const value = Number(budgetDoc.data().value);
        setTotalBudget(value);
        setBudgetForm(value.toString());
      }
    };
    fetchBudget();

    // Listen to Suppliers
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'suppliers');
    });

    // Listen to Payments
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'payments');
    });

    return () => {
      unsubSuppliers();
      unsubPayments();
    };
  }, []);
```

Replace the state declaration line and the whole effect (the form-state
declarations in between — `isSupplierModalOpen` through `budgetForm` —
stay exactly as they are, untouched) as follows.

Replace:
```tsx
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
```
with:
```tsx
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { payments, loading: paymentsLoading } = usePayments();
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [search, setSearch] = useState('');
```

Replace the whole `useEffect` block above with:
```tsx
  useEffect(() => {
    const fetchBudget = async () => {
      const budgetDoc = await getDoc(doc(db, 'settings', 'total_budget'));
      if (budgetDoc.exists()) {
        const value = Number(budgetDoc.data().value);
        setTotalBudget(value);
        setBudgetForm(value.toString());
      }
    };
    fetchBudget();
  }, []);

  const loading = suppliersLoading || paymentsLoading;
```

The one-shot `settings/total_budget` read stays a direct `getDoc` — it's
a single document, not a collection, and per the Global Constraints only
collection-level real-time reads move into shared providers.

- [ ] **Step 3: Memoize derived values and fix the in-place sort**

Current (after the handler functions, before the `if (loading)` guard):

```tsx
  const totalSpent = payments.reduce((acc, p) => acc + (p.status === 'paid' ? p.amount : 0), 0);
  const totalAllocated = suppliers.reduce((acc, s) => acc + (s.budget || 0), 0);
  const remainingBudget = totalBudget - totalSpent;

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.type.toLowerCase().includes(search.toLowerCase())
  );
```

Replace with:

```tsx
  const totalSpent = useMemo(
    () => payments.reduce((acc, p) => acc + (p.status === 'paid' ? p.amount : 0), 0),
    [payments]
  );
  const totalAllocated = useMemo(
    () => suppliers.reduce((acc, s) => acc + (s.budget || 0), 0),
    [suppliers]
  );
  const remainingBudget = totalBudget - totalSpent;

  const filteredSuppliers = useMemo(
    () => suppliers.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase())
    ),
    [suppliers, search]
  );

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [payments]
  );
```

`sortedPayments` is new — it replaces an in-place `.sort()` call that ran
directly inside the JSX (see Step 4). `payments` now comes from
`PaymentsProvider`'s context value; sorting it in place would mutate a
value another consumer of the same context could be relying on, which is
unsafe now that it's shared state rather than page-local state. Sorting a
spread copy (`[...payments]`) avoids that.

- [ ] **Step 4: Use `sortedPayments` and drop the inline sort in JSX**

In the Transactions section, current JSX:

```tsx
            {payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => {
```

Replace with:

```tsx
            {sortedPayments.map(payment => {
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/pages/admin/AdminBudget.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output (clean).
Read through the full diffed file once and confirm every other reference
to `suppliers`/`payments`/`loading` (the JSX cards, the supplier/payment
`.map()` lists, `handleSaveSupplier`/`handleDeleteSupplier`/
`handleSavePayment`/`handleDeletePayment`/`handleSaveBudget`) is
unchanged and still compiles — these handlers were not touched and don't
need to be, since they only read `db`/`doc`/`addDoc`/`updateDoc`/
`deleteDoc`/`serverTimestamp` plus the closure-captured `suppliers`/
`payments` (still in scope, just now sourced from the context hooks
instead of local state).

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/AdminBudget.tsx
git commit -m "perf: migrate AdminBudget onto SuppliersProvider/PaymentsProvider, memoize derived values"
```

---

### Task 7: Migrate AdminReports onto shared contexts

**Files:**
- Modify: `src/pages/admin/AdminReports.tsx`

**Interfaces:**
- Consumes: `useGuests()`, `useSuppliers()`, `usePayments()` (Tasks 2 and pre-existing).

- [ ] **Step 1: Replace the whole file**

`AdminReports.tsx` currently opens its own `guests`, `suppliers`, and
`payments` listeners purely to compute aggregate stats — all three are
now redundant with `GuestsProvider`/`SuppliersProvider`/`PaymentsProvider`.
Replace the entire contents of `src/pages/admin/AdminReports.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Users, Wallet, Ticket, LayoutGrid } from 'lucide-react';
import { useGuests } from '@/features/guests/context/GuestsProvider';
import { useSuppliers } from '@/features/budget/context/SuppliersProvider';
import { usePayments } from '@/features/budget/context/PaymentsProvider';

export default function AdminReports() {
  const { guests, loading: guestsLoading } = useGuests();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { payments, loading: paymentsLoading } = usePayments();
  const [totalBudget, setTotalBudget] = useState(0);
  const [budgetLoaded, setBudgetLoaded] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'total_budget')).then((budgetDoc) => {
      setTotalBudget(Number(budgetDoc.data()?.value || 0));
      setBudgetLoaded(true);
    });
  }, []);

  const stats = useMemo(() => {
    const countedGuests = guests.filter(g => !g.is_baby_or_child);
    const attending = countedGuests.filter(g => g.is_coming === true).length;
    const declined = countedGuests.filter(g => g.is_coming === false).length;
    const pending = countedGuests.filter(g => g.is_coming === null).length;
    const totalAllocated = suppliers.reduce((acc, s) => acc + (s.budget || 0), 0);
    const totalSpent = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);

    return {
      totalGuests: countedGuests.length,
      attending,
      declined,
      pending,
      totalBudget,
      totalAllocated,
      totalSpent
    };
  }, [guests, suppliers, payments, totalBudget]);

  const roleData = useMemo(() => {
    const roles: Record<string, number> = {};
    guests.filter(g => !g.is_baby_or_child).forEach(g => {
      const role = g.role || 'Guest';
      roles[role] = (roles[role] || 0) + 1;
    });
    return Object.entries(roles).map(([name, value]) => ({ name, value }));
  }, [guests]);

  const tableData = useMemo(() => {
    const tables: Record<string, number> = {};
    guests.filter(g => g.is_coming === true && !g.is_baby_or_child && g.table_number).forEach(g => {
      const tableNum = g.table_number as string;
      tables[tableNum] = (tables[tableNum] || 0) + 1;
    });
    return Object.entries(tables).map(([name, value]) => ({ name, value }));
  }, [guests]);

  const budgetData = useMemo(() => {
    const cats: Record<string, number> = {};
    suppliers.forEach(s => {
      cats[s.type] = (cats[s.type] || 0) + (s.budget || 0);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [suppliers]);

  const loading = guestsLoading || suppliersLoading || paymentsLoading || !budgetLoaded;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
      </div>
    );
  }

  const RSVP_COLORS = ['#10b981', '#f43f5e', '#f59e0b'];

  const rsvpPieData = [
    { name: 'Attending', value: stats.attending },
    { name: 'Declined', value: stats.declined },
    { name: 'Pending', value: stats.pending },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-4xl font-serif mb-2">Reports & Insights</h1>
        <p className="text-slate-500">Comprehensive overview of wedding logistics and finances.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <Users className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirmed</p>
              <p className="text-2xl font-bold text-slate-800">{stats.attending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Ticket className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">RSVP Rate</p>
              <p className="text-2xl font-bold text-slate-800">
                {Math.round(((stats.attending + stats.declined) / (stats.totalGuests || 1)) * 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stats.totalBudget < stats.totalSpent ? 'bg-rose-50' : 'bg-wedding-gold/10'}`}>
              <Wallet className={`w-6 h-6 ${stats.totalBudget < stats.totalSpent ? 'text-rose-500' : 'text-wedding-gold'}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Budget Utilization</p>
              <p className={`text-2xl font-bold ${stats.totalBudget < stats.totalSpent ? 'text-rose-500' : 'text-slate-800'}`}>
                {Math.round((stats.totalSpent / (stats.totalBudget || 1)) * 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-purple-50 p-3 rounded-xl">
              <LayoutGrid className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tables Used</p>
              <p className="text-2xl font-bold text-slate-800">{tableData.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="font-serif">RSVP Distribution</CardTitle>
            <CardDescription>Response status of all invited guests</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rsvpPieData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {rsvpPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RSVP_COLORS[index % RSVP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="font-serif">Budget by Category</CardTitle>
            <CardDescription>Allocated amounts per supplier type</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                <Tooltip
                  formatter={(value: number) => `₱${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#d4af37" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm p-6 lg:col-span-2">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="font-serif">Guest Role Breakdown</CardTitle>
            <CardDescription>Distribution of roles across the guest list</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] px-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleData.sort((a, b) => b.value - a.value)}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-45} textAnchor="end" height={80} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#1e293b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm p-6 lg:col-span-2">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="font-serif">Table Occupancy</CardTitle>
            <CardDescription>Current guest count per assigned table (Attending only)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tableData.sort((a, b) => Number(a.name) - Number(b.name))}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#d4af37" fill="#d4af37" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center mt-12 opacity-30">
        <p className="text-xs font-serif italic text-wedding-gold tracking-widest">Polished with ♥ for Israel & Deborah</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/pages/admin/AdminReports.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminReports.tsx
git commit -m "perf: derive AdminReports entirely from shared contexts, drop 3 redundant listeners"
```

---

### Task 8: Migrate AdminTables onto GuestsProvider, batch the reorder write, memoize row components

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`

**Interfaces:**
- Consumes: `useGuests()` (pre-existing), `Guest` type from `src/features/guests/types.ts` (now includes `table_order` per Task 1).

- [ ] **Step 1: Replace the top-of-file imports and local type declarations**

Current (lines 1-67):

```tsx
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Users, 
  User, 
  Crown, 
  Star, 
  GlassWater, 
  Plus, 
  GripVertical,
  Trash2,
  Table as TableIcon,
  UserCheck,
  Search,
  UserX
} from 'lucide-react';
import {
  DndContext, 
  DragOverlay, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '@/lib/firebase';

interface Guest {
  id: string;
  name: string;
  nickname?: string;
  table_type?: 'bridal' | 'vip' | 'regular';
  table_number?: string;
  table_order?: number;
  role?: string;
  is_coming?: boolean | null;
  is_baby_or_child?: boolean;
}

interface Table {
  id: string; // key: type-number
  type: 'bridal' | 'vip' | 'regular';
  number: string;
}
```

Replace with:

```tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Users,
  User,
  Crown,
  Star,
  GlassWater,
  Plus,
  GripVertical,
  Trash2,
  Table as TableIcon,
  UserCheck,
  Search,
  UserX
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '@/lib/firebase';
import { useGuests } from '@/features/guests/context/GuestsProvider';
import type { Guest } from '@/features/guests/types';

interface Table {
  id: string; // key: type-number
  type: 'bridal' | 'vip' | 'regular';
  number: string;
}
```

(The local `interface Guest` is deleted and replaced with an import of
the shared type, which now has `table_order` per Task 1. `interface
Table` is unchanged — there is no shared "table" concept anywhere else in
the app; tables are purely derived UI state local to this page.
`collection`/`onSnapshot` are dropped since the local `guests` listener
goes away in Step 2. `writeBatch` and `useCallback` are added for Steps 3
and 4.)

- [ ] **Step 2: Replace the guests/loading state and the data-derivation effect**

Current:

```tsx
export default function AdminTables() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTables, setActiveTables] = useState<Table[]>([]);
```

...through...

```tsx
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'guests'), (snap) => {
      const guestData = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Guest))
        .filter(g => g.is_coming === true);
      setGuests(guestData);

      // Derive initial tables from guest assignments
      const tablesFromGuests: Record<string, Table> = {};
      
      // Always ensure a Bridal table exists
      tablesFromGuests['bridal-'] = { id: 'bridal-', type: 'bridal', number: '' };

      guestData.forEach(g => {
        if (g.table_type) {
          const key = `${g.table_type}-${g.table_number || ''}`;
          if (!tablesFromGuests[key]) {
            tablesFromGuests[key] = {
              id: key,
              type: g.table_type,
              number: g.table_number || ''
            };
          }
        }
      });
      
      setActiveTables(prev => {
        // Merge with existing active tables to preserve newly created empty tables
        const combined = { ...tablesFromGuests };
        prev.forEach(t => {
          if (!combined[t.id]) combined[t.id] = t;
        });
        
        return Object.values(combined).sort((a,b) => {
           const order = ['bridal', 'vip', 'regular'];
           const aOrder = order.indexOf(a.type);
           const bOrder = order.indexOf(b.type);
           if (aOrder !== bOrder) return aOrder - bOrder;
           return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
        });
      });

      setLoading(false);
    });
    return () => unsub();
  }, []);
```

Replace both blocks together with:

```tsx
export default function AdminTables() {
  const { guests: allGuests, loading } = useGuests();
  const [activeTables, setActiveTables] = useState<Table[]>([]);
```

```tsx
  const guests = useMemo(
    () => allGuests.filter(g => g.is_coming === true),
    [allGuests]
  );

  useEffect(() => {
    const tablesFromGuests: Record<string, Table> = {};

    // Always ensure a Bridal table exists
    tablesFromGuests['bridal-'] = { id: 'bridal-', type: 'bridal', number: '' };

    guests.forEach(g => {
      if (g.table_type) {
        const key = `${g.table_type}-${g.table_number || ''}`;
        if (!tablesFromGuests[key]) {
          tablesFromGuests[key] = {
            id: key,
            type: g.table_type,
            number: g.table_number || ''
          };
        }
      }
    });

    setActiveTables(prev => {
      // Merge with existing active tables to preserve newly created empty tables
      const combined = { ...tablesFromGuests };
      prev.forEach(t => {
        if (!combined[t.id]) combined[t.id] = t;
      });

      return Object.values(combined).sort((a, b) => {
        const order = ['bridal', 'vip', 'regular'];
        const aOrder = order.indexOf(a.type);
        const bOrder = order.indexOf(b.type);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
      });
    });
  }, [guests]);
```

The derived `guests` constant (attending-only, filtered from the shared
`allGuests`) keeps the exact same name and shape the rest of the file
already expects — `unassignedGuests`, `activeGuest`, `handleQuickMove`,
`handleDragEnd` all reference `guests` today and need no further changes
because of this rename-free substitution. The `activeTables` derivation
still needs to stay a `useEffect` + `useState` (not a pure `useMemo`)
because it merges the guest-derived tables with locally-added empty
tables from `handleAddTable`, which have no Firestore backing at all —
this is genuinely stateful, not a pure function of `guests` alone.

- [ ] **Step 3: Batch the drag-and-drop reorder write**

Current (inside `handleDragEnd`):

```tsx
    try {
      // Update all guests in the target list with their NEW order
      const updatePromises = newList.map((g, index) => {
        const guestRef = doc(db, 'guests', g.id);
        const data: any = {
          table_order: index,
          updated_at: serverTimestamp()
        };
        // Only if it's the guest we actually moved, or if we need to update their table info
        if (g.id === activeId) {
          data.table_type = targetType;
          data.table_number = targetNumber;
        }
        return updateDoc(guestRef, data);
      });

      await Promise.all(updatePromises);
      toast.success('Arrangement updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests`);
    }
```

Replace with:

```tsx
    try {
      const batch = writeBatch(db);
      newList.forEach((g, index) => {
        const guestRef = doc(db, 'guests', g.id);
        const data: Record<string, unknown> = {
          table_order: index,
          updated_at: serverTimestamp()
        };
        // Only if it's the guest we actually moved, or if we need to update their table info
        if (g.id === activeId) {
          data.table_type = targetType;
          data.table_number = targetNumber;
        }
        batch.update(guestRef, data);
      });

      await batch.commit();
      toast.success('Arrangement updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests`);
    }
```

`newList` is bounded by the guest count of a single table, never
remotely close to Firestore's 500-op batch limit, so a plain `writeBatch`
is correct here — `commitInChunks` (which exists to chunk larger
operations) isn't needed. This also fixes a latent atomicity gap: the
previous `Promise.all` could partially fail (some guests reordered,
others not); `batch.commit()` is all-or-nothing.

- [ ] **Step 4: Wrap `handleQuickMove` and `handleRemoveTable` in `useCallback`**

Current:

```tsx
  const handleQuickMove = async (guestId: string, tableId: string | null) => {
```

...ends with...

```tsx
  };
```

Change the signature line to:

```tsx
  const handleQuickMove = useCallback(async (guestId: string, tableId: string | null) => {
```

and change its closing `};` to:

```tsx
  }, [guests, activeTables]);
```

Current:

```tsx
  const handleRemoveTable = (id: string) => {
    setActiveTables(prev => prev.filter(t => t.id !== id));
    toast.success('Table removed');
  };
```

Replace with:

```tsx
  const handleRemoveTable = useCallback((id: string) => {
    setActiveTables(prev => prev.filter(t => t.id !== id));
    toast.success('Table removed');
  }, []);
```

- [ ] **Step 5: Memoize `SortableGuestItem` and `DroppableTable`**

Current:

```tsx
const SortableGuestItem: React.FC<{ 
  guest: Guest; 
  isOverlay?: boolean;
  onQuickMove?: (guestId: string, tableId: string | null) => void;
  availableTables?: Table[];
}> = ({ guest, isOverlay = false, onQuickMove, availableTables = [] }) => {
```

Change to:

```tsx
const SortableGuestItem = React.memo<{
  guest: Guest;
  isOverlay?: boolean;
  onQuickMove?: (guestId: string, tableId: string | null) => void;
  availableTables?: Table[];
}>(({ guest, isOverlay = false, onQuickMove, availableTables = [] }) => {
```

Find that component's closing (a bare `};` right before the `const
DroppableTable` declaration begins) and change it to `});`.

Current:

```tsx
const DroppableTable: React.FC<{ 
  table: Table; 
  tableGuests: Guest[]; 
  onRemoveTable: (id: string) => void;
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  unassignedGuests: Guest[];
}> = ({ table, tableGuests, onRemoveTable, onQuickMove, availableTables, unassignedGuests }) => {
```

Change to:

```tsx
const DroppableTable = React.memo<{
  table: Table;
  tableGuests: Guest[];
  onRemoveTable: (id: string) => void;
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  unassignedGuests: Guest[];
}>(({ table, tableGuests, onRemoveTable, onQuickMove, availableTables, unassignedGuests }) => {
```

Find that component's closing (a bare `};` right before the `// ---
Main Page ---` comment) and change it to `});`.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. Pay particular attention to `React.memo`'s generic
inference — if TypeScript complains about the memo-wrapped component's
prop types, confirm the `<{ ... }>` type argument on `React.memo<{...}>`
matches exactly what was previously on `React.FC<{...}>`.
Run: `npx eslint src/pages/admin/AdminTables.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output (clean).
Run: `npm run build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminTables.tsx
git commit -m "perf: migrate AdminTables onto GuestsProvider, batch reorder write, memoize row components"
```

---

### Task 9: Migrate AdminWaitingList onto WaitingListProvider/GuestsProvider

**Files:**
- Modify: `src/pages/admin/AdminWaitingList.tsx`

**Interfaces:**
- Consumes: `useWaitingList()` (Task 3), `useGuests()` (pre-existing), `WaitingGuest` type from `src/features/waitingList/types.ts` (Task 1).

- [ ] **Step 1: Replace the import block and drop the local type**

Current:

```tsx
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit2,
  Hourglass,
  UserPlus
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface WaitingGuest {
  id: string;
  name: string;
  role: string;
  notes: string;
  priority: number;
  created_at: any;
}
```

Replace with:

```tsx
import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit2,
  Hourglass,
  UserPlus
} from 'lucide-react';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useWaitingList } from '@/features/waitingList/context/WaitingListProvider';
import { useGuests } from '@/features/guests/context/GuestsProvider';
import type { WaitingGuest } from '@/features/waitingList/types';
```

(`collection`/`onSnapshot` are dropped — no listener is opened directly
in this file anymore. `addDoc`/`updateDoc`/`deleteDoc`/`doc`/
`serverTimestamp`/`writeBatch` all stay — `handleSave`/`handleDelete`/
`handlePromote` are unchanged single-doc/2-op writes.)

- [ ] **Step 2: Replace state declarations and the listener effect**

Current:

```tsx
export default function AdminWaitingList() {
  const [waitingList, setWaitingList] = useState<WaitingGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<WaitingGuest | null>(null);

  // Form state
  const [form, setForm] = useState({ name: '', role: '', notes: '', priority: '1' });

  const [guests, setGuests] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'waiting_list'), (snap) => {
      setWaitingList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WaitingGuest)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'waiting_list');
    });

    const unsubGuests = onSnapshot(collection(db, 'guests'), (snap) => {
      setGuests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub();
      unsubGuests();
    };
  }, []);
```

Replace with:

```tsx
export default function AdminWaitingList() {
  const { waitingList, loading } = useWaitingList();
  const { guests } = useGuests();
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<WaitingGuest | null>(null);

  // Form state
  const [form, setForm] = useState({ name: '', role: '', notes: '', priority: '1' });
```

`guests` here keeps its original name and shape — `handlePromote` (Step
3) reads `guests.map(g => g.import_order || 0)` unchanged, and the
shared `Guest` type has `import_order?: number`, so no cast or type
change is needed at that call site.

- [ ] **Step 3: Memoize the sorted/filtered list**

Current (after the handler functions, before the `if (loading)` guard):

```tsx
  const sortedList = [...waitingList].sort((a, b) => {
    // Primary: Priority (1 is highest, so ascending)
    const pA = a.priority || 3;
    const pB = b.priority || 3;
    if (pA !== pB) return pA - pB;
    
    // Secondary: Time added (Earliest first for fairness)
    const tA = a.created_at?.seconds || 0;
    const tB = b.created_at?.seconds || 0;
    return tA - tB;
  });
  const filteredList = sortedList.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.role.toLowerCase().includes(search.toLowerCase())
  );
```

Replace with:

```tsx
  const filteredList = useMemo(() => {
    const sortedList = [...waitingList].sort((a, b) => {
      // Primary: Priority (1 is highest, so ascending)
      const pA = a.priority || 3;
      const pB = b.priority || 3;
      if (pA !== pB) return pA - pB;

      // Secondary: Time added (Earliest first for fairness)
      const tA = a.created_at?.seconds || 0;
      const tB = b.created_at?.seconds || 0;
      return tA - tB;
    });
    return sortedList.filter(g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [waitingList, search]);
```

`sortedList` had no other consumer besides feeding `filteredList`, so
folding both into one `useMemo` is a direct, behavior-preserving
consolidation.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/pages/admin/AdminWaitingList.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output (clean).
Read through `handleSave`, `handleDelete`, and `handlePromote` once and
confirm none of them were touched — they should be byte-for-byte
identical to before this task, since they're single-doc/2-op writes
(`handlePromote`'s existing `writeBatch` call) that were already correct.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminWaitingList.tsx
git commit -m "perf: migrate AdminWaitingList onto WaitingListProvider/GuestsProvider, memoize filtered list"
```

---

### Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: zero errors, zero output.

- [ ] **Step 2: Full lint**

Run: `npx eslint . --report-unused-disable-directives --max-warnings 0`
Expected: zero errors, zero warnings, zero output.

- [ ] **Step 3: Full production build**

Run: `npm run build`
Expected: succeeds. Note the resulting bundle sizes for the 5 migrated
pages' chunks in the report (informational only — no size budget is
being enforced in this sub-project).

- [ ] **Step 4: Dangling-reference grep**

Run:
```bash
grep -rn "getCountFromServer\|onSnapshot(collection(db, 'suppliers')\|onSnapshot(collection(db, 'payments')\|onSnapshot(collection(db, 'waiting_list')" src/pages/admin/AdminDashboard.tsx src/pages/admin/AdminBudget.tsx src/pages/admin/AdminReports.tsx src/pages/admin/AdminTables.tsx src/pages/admin/AdminWaitingList.tsx
```
Expected: no output — confirms `AdminDashboard` no longer polls via
`getCountFromServer`, and none of the 5 pages open their own
`suppliers`/`payments`/`waiting_list` listener anymore (they all read
through the shared providers wired in Task 4).

Run:
```bash
grep -n "onSnapshot(collection(db, 'guests')" src/pages/admin/AdminReports.tsx src/pages/admin/AdminTables.tsx src/pages/admin/AdminWaitingList.tsx
```
Expected: no output — confirms these three pages no longer open their own
`guests` listener (they all read through the existing `GuestsProvider`).

- [ ] **Step 5: Update the design spec with a Results section**

Append a `## Results` section to
`docs/superpowers/specs/2026-08-01-admin-remaining-pages-data-layer-design.md`,
following the same format as the `## Results` section in
`docs/superpowers/specs/2026-07-31-admin-guests-invites-inline-editing-design.md`
(what was verified, `tsc`/`build` output summary, the grep commands run
and their empty output, and an explicit "not verified — no browser
automation available" list covering: live drag-and-drop reorder in
`AdminTables` actually persisting via the new batched write; the
Dashboard's real-time count updates actually reflecting a guest RSVP
change without a page refresh; all 5 pages' existing CRUD flows
(add/edit/delete supplier, payment, waiting-list entry) still working
end-to-end in a browser).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-08-01-admin-remaining-pages-data-layer-design.md
git commit -m "docs: record sub-project 2b verification results"
```
