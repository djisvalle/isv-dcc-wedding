# Admin Guests & Invites Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `AdminGuests.tsx` and `AdminInvites.tsx`'s data-layer root causes: 4 duplicated real-time listeners collapsed into 2 shared ones, 5 sequential-write-loop sites replaced with batched writes, and near-zero memoization replaced with a memoized filter/sort pipeline plus `React.memo`'d table rows.

**Architecture:** New `features/guests/` and `features/invites/` modules (types, a React Context wrapping one shared `onSnapshot` each, and a plain-async API layer for batched writes) consumed by the existing page files, which stay in place. `AdminLayout.tsx` hosts both providers so the listeners persist across admin navigation instead of being torn down and recreated per page.

**Tech Stack:** React 18, TypeScript, Firebase Firestore (`onSnapshot`, `writeBatch`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-31-admin-guests-invites-data-layer-design.md`

## Global Constraints

- No visual or workflow change — this is a data-layer and re-render-performance pass only. Source: spec "Explicitly out of scope."
- Only `AdminGuests.tsx` and `AdminInvites.tsx` are migrated onto shared context in this plan. `AdminBudget.tsx`, `AdminReports.tsx`, `AdminTables.tsx`, `AdminWaitingList.tsx`, `AdminDashboard.tsx` are untouched (sub-project 2b). Source: spec "Explicitly out of scope."
- Only `GuestRow`/`InviteRow` are extracted into their own files (required for `React.memo`). Dialogs, filters, and pagination controls stay inline in the page files. Source: spec "Key Decisions."
- Verification is manual only. No test runner is introduced; no unit tests are written. Source: spec "Explicitly out of scope," consistent with sub-project 1.
- All Firestore error logging goes through the existing `handleFirestoreError`/`OperationType` pattern in `src/lib/firebase.ts`. New API-module functions call it internally; page-level `catch` blocks that call an API function do **not** call `handleFirestoreError` a second time (it already ran inside the function) — they just `toast.error(...)`, matching the pattern already established in `src/features/rsvp/api/rsvpApi.ts` (sub-project 1).
- Batched writes are chunked at Firestore's 500-operation-per-batch hard limit. Source: spec "Success Criteria."
- Preserve exact pre-existing behavior everywhere not explicitly named as a fix target — including quirks (e.g. `AdminGuests.tsx`'s bulk-import `import_order` restarting at 0 on every import, and the `uploading` spinner's `finally` timing). Do not silently "fix" anything not named in this plan.

---

### Task 1: Create the shared Firestore batch-chunking utility

**Files:**
- Create: `src/lib/firestoreBatch.ts`

**Interfaces:**
- Produces: `commitInChunks<T>(items: T[], applyOp: (item: T, batch: WriteBatch) => void, chunkSize?: number): Promise<void>`. Consumed by Task 5 (`guestsApi.ts`).

- [ ] **Step 1: Create the utility**

Create `src/lib/firestoreBatch.ts`:

```ts
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (no consumers yet, but must type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add src/lib/firestoreBatch.ts
git commit -m "feat: add Firestore batch-chunking utility"
```

---

### Task 2: Create the debounce hook

**Files:**
- Create: `src/hooks/useDebounce.ts`

**Interfaces:**
- Produces: `useDebounce<T>(value: T, delayMs: number): T`. Consumed by Task 10 (`AdminGuests.tsx`) and Task 11 (`AdminInvites.tsx`).

- [ ] **Step 1: Create the hook**

Create `src/hooks/useDebounce.ts`:

```ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDebounce.ts
git commit -m "feat: add useDebounce hook"
```

---

### Task 3: Create guests domain types

**Files:**
- Create: `src/features/guests/types.ts`

**Interfaces:**
- Produces: `Guest`, `TableType`. `Guest` is consumed by Task 4, Task 10, and Task 11 (all three need the entity type). `TableType` is not imported by name anywhere outside this file — it exists purely as the exported, single-source-of-truth type behind `Guest.table_type`.

- [ ] **Step 1: Create the types file**

Create `src/features/guests/types.ts`:

```ts
export type TableType = 'bridal' | 'vip' | 'regular';

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

This is the canonical shape for the full guest document as used by the admin pages. It is deliberately separate from `src/features/rsvp/types.ts`'s narrower guest-facing `Guest` type (sub-project 1) — that type serves a different, smaller set of consumers and is left untouched to avoid destabilizing already-shipped code for no behavioral benefit. `invite_name` (a client-computed join field, not a real Firestore field) is intentionally not part of this type — components that need it type it locally as `Guest & { invite_name?: string | null }`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/guests/types.ts
git commit -m "feat: add guests domain types"
```

---

### Task 4: Create the shared guests context

**Files:**
- Create: `src/features/guests/context/GuestsProvider.tsx`

**Interfaces:**
- Consumes: `Guest` from `../types` (Task 3). `db`, `handleFirestoreError`, `OperationType` from `@/lib/firebase` (existing).
- Produces: `GuestsProvider` (component, wraps `children`), `useGuests()` (returns `{ guests: Guest[]; loading: boolean }`). Consumed by Task 9 (`AdminLayout.tsx`), Task 10 (`AdminGuests.tsx`), Task 11 (`AdminInvites.tsx`).

- [ ] **Step 1: Create the provider**

Create `src/features/guests/context/GuestsProvider.tsx`:

```tsx
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
      (err) => handleFirestoreError(err, OperationType.LIST, 'guests')
    );
    return unsubscribe;
  }, []);

  return (
    <GuestsContext.Provider value={{ guests, loading }}>
      {children}
    </GuestsContext.Provider>
  );
}

export function useGuests() {
  return useContext(GuestsContext);
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/guests/context/GuestsProvider.tsx
git commit -m "feat: add shared guests real-time context"
```

---

### Task 5: Create the guests batched-write API module

**Files:**
- Create: `src/features/guests/api/guestsApi.ts`

**Interfaces:**
- Consumes: `commitInChunks` from `@/lib/firestoreBatch` (Task 1). `db`, `handleFirestoreError`, `OperationType` from `@/lib/firebase` (existing).
- Produces: `batchDeleteGuests(ids: string[]): Promise<void>`, `batchUpdateGuestStatus(ids: string[], status: boolean | null): Promise<void>`, `GuestImportRow` (`{ name: string; role?: string | null; invite_id?: string | null }`), `batchImportGuests(rows: GuestImportRow[]): Promise<void>`, `WaitingListEntry` (`{ id: string; name: string; role: string | null }`), `batchMoveToWaitingList(entries: WaitingListEntry[]): Promise<void>`. Consumed by Task 10 (`AdminGuests.tsx`).

- [ ] **Step 1: Create the API module**

Create `src/features/guests/api/guestsApi.ts`:

```ts
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { commitInChunks } from '@/lib/firestoreBatch';

export async function batchDeleteGuests(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await commitInChunks(ids, (id, batch) => {
    batch.delete(doc(db, 'guests', id));
  }).catch(err => {
    handleFirestoreError(err, OperationType.DELETE, 'guests/multiple');
    throw err;
  });
}

export async function batchUpdateGuestStatus(ids: string[], status: boolean | null): Promise<void> {
  if (ids.length === 0) return;
  await commitInChunks(ids, (id, batch) => {
    batch.update(doc(db, 'guests', id), { is_coming: status, updated_at: serverTimestamp() });
  }).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, 'guests/multiple');
    throw err;
  });
}

export interface GuestImportRow {
  name: string;
  role?: string | null;
  invite_id?: string | null;
}

export async function batchImportGuests(rows: GuestImportRow[]): Promise<void> {
  if (rows.length === 0) return;
  let index = 0;
  await commitInChunks(rows, (row, batch) => {
    const ref = doc(collection(db, 'guests'));
    batch.set(ref, {
      name: row.name,
      role: row.role || null,
      invite_id: row.invite_id || null,
      is_coming: null,
      import_order: index++,
      updated_at: serverTimestamp()
    });
  }).catch(err => {
    handleFirestoreError(err, OperationType.CREATE, 'guests/bulk-import');
    throw err;
  });
}

export interface WaitingListEntry {
  id: string;
  name: string;
  role: string | null;
}

export async function batchMoveToWaitingList(entries: WaitingListEntry[]): Promise<void> {
  if (entries.length === 0) return;
  // 2 ops per entry (waiting_list add + guests delete) — chunk at 250
  // entries so each chunk stays under Firestore's 500-op batch limit.
  await commitInChunks(entries, (entry, batch) => {
    const waitingRef = doc(collection(db, 'waiting_list'));
    batch.set(waitingRef, {
      name: entry.name,
      role: entry.role || 'Guest',
      notes: 'Moved from guest list',
      priority: 3,
      created_at: serverTimestamp()
    });
    batch.delete(doc(db, 'guests', entry.id));
  }, 250).catch(err => {
    handleFirestoreError(err, OperationType.WRITE, 'guests/move_to_waiting');
    throw err;
  });
}
```

Note: `batchImportGuests`'s `import_order` intentionally starts at `0` for every call, matching the exact pre-existing behavior of `AdminGuests.tsx`'s current `onDrop` handler (it does not continue from the existing max `import_order` — this is a known pre-existing quirk, preserved deliberately, not a bug introduced here).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/guests/api/guestsApi.ts
git commit -m "feat: add batched-write API for guest mutations"
```

---

### Task 6: Create invites domain types

**Files:**
- Create: `src/features/invites/types.ts`

**Interfaces:**
- Produces: `Invite`, `InviteWithCounts`. `Invite` is consumed by Task 7 and Task 11. `InviteWithCounts` is consumed by Task 11 only. Task 8 (`invitesApi.ts`) does not import from this file — `createInviteWithGuests`'s `inviteData` parameter is typed inline as `{ name: string; import_order: number }` since the function only ever needs those two fields, not the full `Invite` shape.

- [ ] **Step 1: Create the types file**

Create `src/features/invites/types.ts`:

```ts
export interface Invite {
  id: string;
  name: string;
  import_order?: number;
  created_at?: any;
}

export interface InviteWithCounts extends Invite {
  guest_count: number;
  attending_count: number;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/invites/types.ts
git commit -m "feat: add invites domain types"
```

---

### Task 7: Create the shared invites context

**Files:**
- Create: `src/features/invites/context/InvitesProvider.tsx`

**Interfaces:**
- Consumes: `Invite` from `../types` (Task 6).
- Produces: `InvitesProvider` (component), `useInvites()` (returns `{ invites: Invite[]; loading: boolean }`). Consumed by Task 9, Task 10, Task 11.

- [ ] **Step 1: Create the provider**

Create `src/features/invites/context/InvitesProvider.tsx`:

```tsx
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
      (err) => handleFirestoreError(err, OperationType.LIST, 'invites')
    );
    return unsubscribe;
  }, []);

  return (
    <InvitesContext.Provider value={{ invites, loading }}>
      {children}
    </InvitesContext.Provider>
  );
}

export function useInvites() {
  return useContext(InvitesContext);
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/invites/context/InvitesProvider.tsx
git commit -m "feat: add shared invites real-time context"
```

---

### Task 8: Create the invites batched-write API module

**Files:**
- Create: `src/features/invites/api/invitesApi.ts`

**Interfaces:**
- Consumes: `db`, `handleFirestoreError`, `OperationType` from `@/lib/firebase` (existing).
- Produces: `createInviteWithGuests(inviteId: string, inviteData: { name: string; import_order: number }, guestNames: string[], role?: string | null): Promise<void>`, `deleteInviteAndUnassignGuests(inviteId: string): Promise<void>`. Consumed by Task 11 (`AdminInvites.tsx`).

- [ ] **Step 1: Create the API module**

Create `src/features/invites/api/invitesApi.ts`:

```ts
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
```

`deleteInviteAndUnassignGuests` deletes the invite doc in the same batch as the first chunk of guest-unassignments, which is strictly safer than the original sequential-loop-then-delete: if it fails partway, either nothing in that chunk happened or all of it did — there's no window where guests are partially unassigned but the invite still exists (or vice versa) within a chunk.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/invites/api/invitesApi.ts
git commit -m "feat: add batched-write API for invite mutations"
```

---

### Task 9: Wire both providers into AdminLayout

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: `GuestsProvider` from `@/features/guests/context/GuestsProvider` (Task 4), `InvitesProvider` from `@/features/invites/context/InvitesProvider` (Task 7).

- [ ] **Step 1: Add the imports**

In `src/components/admin/AdminLayout.tsx`, add after the existing `import { useEffect } from 'react';` line:

```tsx
import { GuestsProvider } from '@/features/guests/context/GuestsProvider';
import { InvitesProvider } from '@/features/invites/context/InvitesProvider';
```

- [ ] **Step 2: Wrap the routed content**

Find:

```tsx
        <motion.div
           key={location.pathname}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
```

Replace with:

```tsx
        <motion.div
           key={location.pathname}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3 }}
        >
          <GuestsProvider>
            <InvitesProvider>
              <Outlet />
            </InvitesProvider>
          </GuestsProvider>
        </motion.div>
```

Both listeners now subscribe once when `AdminLayout` mounts (once per admin session) and stay alive across every nested-route navigation, instead of each page creating and tearing down its own.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, log into `/admin`, confirm the dashboard and sidebar still render normally (this task alone doesn't change any page's behavior yet — `AdminGuests`/`AdminInvites` still run their own listeners until Tasks 10–11 land).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminLayout.tsx
git commit -m "feat: host shared guests/invites providers in AdminLayout"
```

---

### Task 10: Rewire AdminGuests.tsx onto shared context, batched writes, and memoization

**Files:**
- Create: `src/components/admin/guests/GuestRow.tsx`
- Modify: `src/pages/admin/AdminGuests.tsx`

**Interfaces:**
- Consumes: `useGuests` (Task 4), `useInvites` (Task 7, used at runtime only — `AdminGuests.tsx` never needs an explicit `Invite` type annotation, so it does not import the `Invite` type itself), `batchDeleteGuests`/`batchUpdateGuestStatus`/`batchImportGuests`/`batchMoveToWaitingList` (Task 5), `useDebounce` (Task 2), `Guest` from `@/features/guests/types` (Task 3) — `TableType` (also exported by Task 3) is not imported by name here either; `Guest.table_type` already resolves to it structurally within `types.ts`.
- Produces: `GuestRow` (named export, `React.memo`'d).

This task touches the whole file's data layer and several handler bodies in one pass — the read path (removing the local `onSnapshot`), the write path (4 of `AdminGuests.tsx`'s handlers), and the memoization (derived-state pipeline + row extraction) are too entangled to split into separately-committed sub-steps without an intermediate broken build, the same reasoning as sub-project 1's Task 5.

- [ ] **Step 1: Create GuestRow.tsx**

Create `src/components/admin/guests/GuestRow.tsx`:

```tsx
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, UserCheck, UserX, UserMinus, Edit2, Trash2, MessageSquare, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import type { Guest } from '@/features/guests/types';

interface GuestRowProps {
  guest: Guest & { invite_name?: string | null };
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateStatus: (ids: string[], status: boolean | null) => void;
  onMoveToWaiting: (ids: string[]) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (id: string) => void;
  onCopyMessage: (guest: Guest) => void;
}

function GuestRowComponent({
  guest,
  selected,
  onToggleSelect,
  onUpdateStatus,
  onMoveToWaiting,
  onEdit,
  onDelete,
  onCopyMessage,
}: GuestRowProps) {
  return (
    <TableRow className="group hover:bg-slate-50/50 transition-colors">
      <TableCell className="px-8">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(guest.id)}
        />
      </TableCell>
      <TableCell className="py-6 px-8 text-xs font-mono text-slate-400">
        {guest.import_order !== undefined ? guest.import_order + 1 : '-'}
      </TableCell>
      <TableCell className="py-6 px-8">
        <div className="font-semibold text-slate-700">{guest.name}</div>
        {guest.nickname && (
          <div className="text-[10px] text-slate-400 italic">"{guest.nickname}"</div>
        )}
        {(guest.table_type || guest.table_number) && (
          <div className="mt-1 flex gap-1">
            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-bold">
              {guest.table_type === 'bridal' ? 'Bridal Table' : guest.table_type === 'vip' ? `VIP ${guest.table_number || ''}` : `Reg ${guest.table_number || ''}`}
            </span>
          </div>
        )}
        {guest.updated_at && (
          <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
            Updated {guest.updated_at.seconds ? new Date(guest.updated_at.seconds * 1000).toLocaleDateString() : new Date(guest.updated_at).toLocaleDateString()}
          </div>
        )}
      </TableCell>
      <TableCell className="py-6 px-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <code className="text-[10px] px-1.5 py-0.5 bg-wedding-gold/10 text-wedding-gold rounded truncate max-w-[120px]" title={guest.invite_id || `ind-${guest.id.substring(0, 5)}`}>
              {guest.invite_id || `ind-${guest.id.substring(0, 5)}`}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                const link = `${window.location.origin}/rsvp/${guest.invite_id || guest.id}`;
                navigator.clipboard.writeText(link);
                toast.success(guest.invite_id ? 'Group Link copied' : 'Link copied');
              }}
              title={guest.invite_id ? "Copy Group RSVP Link" : "Copy RSVP Link"}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          {guest.invite_id && (
            <div className="flex items-center gap-2">
              <code className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded truncate max-w-[120px]" title={`ind-${guest.id.substring(0, 5)}`}>
                ind-{guest.id.substring(0, 5)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-slate-600"
                onClick={() => {
                  const link = `${window.location.origin}/rsvp/${guest.id}`;
                  navigator.clipboard.writeText(link);
                  toast.success('Individual Link copied');
                }}
                title="Copy Individual RSVP Link"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="py-6 px-8">
        {guest.role ? (
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
            {guest.role}
          </span>
        ) : (
          <span className="text-slate-300 italic text-xs">Guest</span>
        )}
      </TableCell>
      <TableCell className="py-6 px-8 text-slate-500 italic font-serif">
        {guest.invite_name || <span className="text-slate-300 opacity-50">Unassigned</span>}
      </TableCell>
      <TableCell className="py-6 px-8">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-[100px]">
            {guest.is_coming === true ? (
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                <UserCheck className="w-4 h-4" /> Attending
              </div>
            ) : guest.is_coming === false ? (
              <div className="flex items-center gap-1.5 text-rose-500 font-semibold text-sm">
                <UserX className="w-4 h-4" /> Declined
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-sm italic">
                <UserMinus className="w-4 h-4" /> Pending
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-full ${guest.is_coming === true ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600'}`}
              onClick={() => onUpdateStatus([guest.id], true)}
              title="Mark as Attending"
            >
              <UserCheck className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-full ${guest.is_coming === false ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-rose-500'}`}
              onClick={() => onUpdateStatus([guest.id], false)}
              title="Mark as Declined"
            >
              <UserX className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-full ${guest.is_coming === null ? 'text-slate-600 bg-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              onClick={() => onUpdateStatus([guest.id], null)}
              title="Mark as Pending"
            >
              <UserMinus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-6 px-8 text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMoveToWaiting([guest.id])}
            className="text-slate-400 hover:text-amber-600 hover:bg-amber-50"
            title="Move to Waiting List"
          >
            <Hourglass className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(guest)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(guest.id)}
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopyMessage(guest)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
            title="Copy Message"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export const GuestRow = React.memo(GuestRowComponent);
```

This is a direct extraction of `AdminGuests.tsx`'s existing per-row JSX (currently inline inside the `paginatedGuests.map(...)` call) with the `guest`-closure handlers (`handleUpdateStatus`, `handleMoveToWaitingList`, `setEditingGuest`/`setIsEditOpen`, `handleDeleteGuest`, `copyMessage`, `toggleSelect`) converted to props — no visual or behavioral change.

- [ ] **Step 2: Replace AdminGuests.tsx's imports and type declarations**

In `src/pages/admin/AdminGuests.tsx`, replace lines 1–116 (everything from the top import through the end of the `ROLE_PRIORITY` constant) with:

```tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, Search, Loader2, UserCheck, UserX, UserMinus, Plus, Trash2, Edit2, Upload, FileSpreadsheet, ArrowUpDown, ChevronLeft, ChevronRight, Copy, X, MessageSquare } from 'lucide-react';
import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  getDoc,
  DocumentSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuests } from '@/features/guests/context/GuestsProvider';
import { useInvites } from '@/features/invites/context/InvitesProvider';
import { batchDeleteGuests, batchUpdateGuestStatus, batchImportGuests, batchMoveToWaitingList } from '@/features/guests/api/guestsApi';
import { useDebounce } from '@/hooks/useDebounce';
import { GuestRow } from '@/components/admin/guests/GuestRow';
import type { Guest } from '@/features/guests/types';

const TABLE_TYPES = [
  { id: 'bridal', label: 'Bridal Table' },
  { id: 'vip', label: 'VIP Table' },
  { id: 'regular', label: 'Regular Table' }
];

const GUEST_ROLES = [
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

const ROLE_PRIORITY: Record<string, number> = {
  'Groom': 1,
  'Bride': 2,
  'Mother of the Groom': 3,
  'Father of the Bride': 4,
  'Mother of the Bride': 4,
  'Principal Sponsor': 5,
  'Principal': 5,
  'Secondary Sponsor': 6,
  'Secondary': 6,
  'Best Man': 7,
  'Maid of Honor': 8,
  'MOH': 8,
  'Groomsman': 9,
  'Bridesmaid': 10,
  'Guest': 11
};
```

`TABLE_TYPES`, `GUEST_ROLES`, and `ROLE_PRIORITY` are copied verbatim, unchanged — only the local `interface Guest {...}` and `interface Invite {...}` are removed, replaced by the type imports. `QuerySnapshot` is dropped from the firestore import (it was only used to type the two `onSnapshot` callbacks removed in Step 3); `onSnapshot` and `writeBatch` are dropped since their only call sites in this file are removed in Step 3 and Step 4.

- [ ] **Step 3: Replace the component's data-source state and effect**

Find:

```tsx
export default function AdminGuests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
```

Replace with:

```tsx
export default function AdminGuests() {
  const { guests, loading } = useGuests();
  const { invites } = useInvites();
```

Then find the data-fetching `useEffect`:

```tsx
  useEffect(() => {
    const unsubInvites = onSnapshot(collection(db, 'invites'), (snap: QuerySnapshot) => {
      setInvites(snap.docs.map(d => ({ id: d.id, name: d.data().name } as Invite)));
    });

    const unsubGuests = onSnapshot(collection(db, 'guests'), (snap: QuerySnapshot) => {
      setGuests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Guest)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'guests');
    });

    getDoc(doc(db, 'settings', 'invite_message_template')).then((snap: DocumentSnapshot) => {
      if (snap.exists()) {
        setMessageTemplate(snap.data().value);
      }
    });

    return () => {
      unsubInvites();
      unsubGuests();
    };
  }, []);
```

Replace with:

```tsx
  useEffect(() => {
    getDoc(doc(db, 'settings', 'invite_message_template')).then((snap: DocumentSnapshot) => {
      if (snap.exists()) {
        setMessageTemplate(snap.data().value);
      }
    });
  }, []);
```

(The rest of the state block — `search`, `selectedIds`, `editingGuest`, dialog-open flags, sort/pagination/filter state, `newGuest`, the searchable-dropdown popover flags — is unchanged; this edit only touches the lines shown above.)

- [ ] **Step 4: Replace the write handlers**

Find `copyMessage`:

```tsx
  const copyMessage = (guest: Guest) => {
    // 1. Resolve Name
    const inviteGroup = invites.find(i => i.id === guest.invite_id);
    const displayName = inviteGroup?.name || guest.nickname || guest.name;

    // 2. Resolve link
    const link = `${window.location.origin}/?inviteUrl=${guest.invite_id || guest.id}`;
    
    // 3. Replace template
    const message = messageTemplate
      .replace('<name>', displayName)
      .replace('<link>', link);
    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard');
  };
```

Replace with:

```tsx
  const copyMessage = useCallback((guest: Guest) => {
    const inviteGroup = invites.find(i => i.id === guest.invite_id);
    const displayName = inviteGroup?.name || guest.nickname || guest.name;
    const link = `${window.location.origin}/?inviteUrl=${guest.invite_id || guest.id}`;
    const message = messageTemplate
      .replace('<name>', displayName)
      .replace('<link>', link);
    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard');
  }, [invites, messageTemplate]);
```

Leave `handleExport`, `handleAddGuest`, `handleEditGuest` completely untouched.

Find `handleDeleteGuest`:

```tsx
  const handleDeleteGuest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'guests', id));
      toast.success('Guest deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `guests/${id}`);
      toast.error('Failed to delete guest');
    }
  };
```

Replace with:

```tsx
  const handleDeleteGuest = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'guests', id));
      toast.success('Guest deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `guests/${id}`);
      toast.error('Failed to delete guest');
    }
  }, []);
```

Find `handleBulkDelete`:

```tsx
  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, 'guests', id));
      }
      toast.success('Guests deleted successfully');
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete guests');
    }
  };
```

Replace with:

```tsx
  const handleBulkDelete = async () => {
    try {
      await batchDeleteGuests(selectedIds);
      toast.success('Guests deleted successfully');
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete guests');
    }
  };
```

Find `handleUpdateStatus`:

```tsx
  const handleUpdateStatus = async (ids: string[], status: boolean | null) => {
    try {
      for (const id of ids) {
        await updateDoc(doc(db, 'guests', id), {
          is_coming: status,
          updated_at: serverTimestamp()
        });
      }
      toast.success('Status updated successfully');
      if (ids.length > 1) setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };
```

Replace with:

```tsx
  const handleUpdateStatus = useCallback(async (ids: string[], status: boolean | null) => {
    try {
      await batchUpdateGuestStatus(ids, status);
      toast.success('Status updated successfully');
      if (ids.length > 1) setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to update status');
    }
  }, []);
```

Find `handleMoveToWaitingList`:

```tsx
  const handleMoveToWaitingList = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      for (const id of ids) {
        const guest = guests.find(g => g.id === id);
        if (!guest) continue;

        // 1. Add to Waiting List
        const waitingRef = doc(collection(db, 'waiting_list'));
        batch.set(waitingRef, {
          name: guest.name,
          role: guest.role || 'Guest',
          notes: 'Moved from guest list',
          priority: 3,
          created_at: serverTimestamp()
        });

        // 2. Delete from Guests
        batch.delete(doc(db, 'guests', id));
      }
      await batch.commit();
      toast.success('Guests moved to waiting list');
      setSelectedIds([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'guests/move_to_waiting');
      toast.error('Failed to move guests');
      console.error(err);
    }
  };
```

Replace with:

```tsx
  const handleMoveToWaitingList = useCallback(async (ids: string[]) => {
    try {
      const entries = ids
        .map(id => guests.find(g => g.id === id))
        .filter((g): g is Guest => !!g)
        .map(g => ({ id: g.id, name: g.name, role: g.role }));
      await batchMoveToWaitingList(entries);
      toast.success('Guests moved to waiting list');
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to move guests');
    }
  }, [guests]);
```

Find the `onDrop` bulk-import handler's inner loop:

```tsx
        let index = 0;
        for (const row of rows) {
          if (row.name) {
            await addDoc(collection(db, 'guests'), {
              name: row.name,
              role: row.role || null,
              invite_id: row.inviteId || null,
              is_coming: null,
              import_order: index++,
              updated_at: serverTimestamp()
            });
          }
        }
        toast.success('Successfully imported guest list');
        setIsUploadOpen(false);
```

Replace with:

```tsx
        await batchImportGuests(
          rows
            .filter(row => row.name)
            .map(row => ({ name: row.name, role: row.role || null, invite_id: row.inviteId || null }))
        );
        toast.success('Successfully imported guest list');
        setIsUploadOpen(false);
```

(The surrounding `onDrop` structure — the `setUploading(true)`/`try`/`catch`/`finally` wrapper, the `FileReader`/`xlsx` parsing above this block — is unchanged; only the loop body is replaced. This preserves the existing `finally { setUploading(false) }` timing exactly as it is today, including its pre-existing quirk of firing before the async `reader.onload` callback completes — not a target of this plan.)

Add a new stable edit-click handler. Find (this is currently only inline JSX, not a named handler — add this new `const` near the other handlers, after `handleDeleteGuest`):

```tsx
  const handleEditClick = useCallback((guest: Guest) => {
    setEditingGuest(guest);
    setIsEditOpen(true);
  }, []);
```

Find `toggleSelect`:

```tsx
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
```

Replace with:

```tsx
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);
```

Leave `toggleSelectAll` and `handleSort` untouched.

- [ ] **Step 5: Memoize the derived-state pipeline**

Find:

```tsx
  const guestsWithInviteName = guests.map(g => ({
    ...g,
    invite_name: invites.find(i => i.id === g.invite_id)?.name
  }));

  const filteredGuests = guestsWithInviteName.filter(g => {
    const searchMatch = (g.name?.toLowerCase() || '').includes(search.toLowerCase()) || 
      (g.nickname?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (g.invite_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (g.role?.toLowerCase() || '').includes(search.toLowerCase());
    
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'attending' && g.is_coming === true) ||
      (statusFilter === 'declined' && g.is_coming === false) ||
      (statusFilter === 'pending' && g.is_coming === null);

    const roleMatch = roleFilter === 'all' || g.role === roleFilter || (roleFilter === 'guest' && !g.role);
    
    const tableMatch = tableFilter === 'all' || 
      (tableFilter === 'assigned' && g.table_type) ||
      (tableFilter === 'unassigned' && !g.table_type) ||
      g.table_type === tableFilter;
      
    return searchMatch && statusMatch && roleMatch && tableMatch;
  });

  const sortedGuests = [...filteredGuests].sort((a, b) => {
    if (sortField === 'role') {
      const aPriority = a.role ? (ROLE_PRIORITY[a.role] || 99) : 11;
      const bPriority = b.role ? (ROLE_PRIORITY[b.role] || 99) : 11;
      
      if (aPriority !== bPriority) {
        return sortDirection === 'asc' ? aPriority - bPriority : bPriority - aPriority;
      }
      // If same priority, alphabetize by name
      return a.name.localeCompare(b.name);
    }

    const aVal = a[sortField as keyof Guest] ?? 0;
    const bVal = b[sortField as keyof Guest] ?? 0;

    let comparison = 0;
    
    if (sortField === 'updated_at') {
      const aTime = (a.updated_at?.seconds || 0);
      const bTime = (b.updated_at?.seconds || 0);
      comparison = aTime - bTime;
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      comparison = aStr.localeCompare(bStr);
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
```

Replace with:

```tsx
  const debouncedSearch = useDebounce(search, 300);

  const sortedGuests = useMemo(() => {
    const guestsWithInviteName = guests.map(g => ({
      ...g,
      invite_name: invites.find(i => i.id === g.invite_id)?.name
    }));

    const filteredGuests = guestsWithInviteName.filter(g => {
      const searchMatch = (g.name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) || 
        (g.nickname?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
        (g.invite_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
        (g.role?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());
      
      const statusMatch = statusFilter === 'all' || 
        (statusFilter === 'attending' && g.is_coming === true) ||
        (statusFilter === 'declined' && g.is_coming === false) ||
        (statusFilter === 'pending' && g.is_coming === null);

      const roleMatch = roleFilter === 'all' || g.role === roleFilter || (roleFilter === 'guest' && !g.role);
      
      const tableMatch = tableFilter === 'all' || 
        (tableFilter === 'assigned' && g.table_type) ||
        (tableFilter === 'unassigned' && !g.table_type) ||
        g.table_type === tableFilter;
        
      return searchMatch && statusMatch && roleMatch && tableMatch;
    });

    return [...filteredGuests].sort((a, b) => {
      if (sortField === 'role') {
        const aPriority = a.role ? (ROLE_PRIORITY[a.role] || 99) : 11;
        const bPriority = b.role ? (ROLE_PRIORITY[b.role] || 99) : 11;
        
        if (aPriority !== bPriority) {
          return sortDirection === 'asc' ? aPriority - bPriority : bPriority - aPriority;
        }
        return a.name.localeCompare(b.name);
      }

      const aVal = a[sortField as keyof Guest] ?? 0;
      const bVal = b[sortField as keyof Guest] ?? 0;

      let comparison = 0;
      
      if (sortField === 'updated_at') {
        const aTime = (a.updated_at?.seconds || 0);
        const bTime = (b.updated_at?.seconds || 0);
        comparison = aTime - bTime;
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        comparison = aStr.localeCompare(bStr);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [guests, invites, debouncedSearch, statusFilter, roleFilter, tableFilter, sortField, sortDirection]);
```

`totalPages`/`paginatedGuests` (the two lines immediately below this block) are unchanged — they still derive from `sortedGuests`, just now the memoized value.

- [ ] **Step 6: Replace the inline row JSX with `<GuestRow>`**

Find the table body's row-mapping branch:

```tsx
            ) : paginatedGuests.map((guest) => (
              <TableRow key={guest.id} className="group hover:bg-slate-50/50 transition-colors">
```

...through its matching closing `</TableRow>` and `))}` (this is the large block ending right before `</TableBody>`, containing all the `<TableCell>` markup for a single row — the same JSX now living in `GuestRow.tsx` from Step 1).

Replace the entire `paginatedGuests.map((guest) => ( <TableRow>...</TableRow> ))` expression with:

```tsx
            ) : paginatedGuests.map((guest) => (
              <GuestRow
                key={guest.id}
                guest={guest}
                selected={selectedIds.includes(guest.id)}
                onToggleSelect={toggleSelect}
                onUpdateStatus={handleUpdateStatus}
                onMoveToWaiting={handleMoveToWaitingList}
                onEdit={handleEditClick}
                onDelete={handleDeleteGuest}
                onCopyMessage={copyMessage}
              />
            ))}
```

Everything else in the JSX (the header, dialogs, filters, pagination controls, and the edit dialog) is unchanged.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors/warnings.

Run: `npm run dev`, log into `/admin/guests`.
Expected: page loads, table renders identically to before, search/filter/sort/pagination all behave the same, bulk-select + bulk actions (attend/decline/clear/move-to-waiting/delete) work, individual row actions work, add/edit guest dialogs work, Excel import/export work. Open the Network/Firestore console before a bulk action and confirm it fires exactly one batch commit (or the expected small number of chunked commits) rather than one write per guest.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/guests/GuestRow.tsx src/pages/admin/AdminGuests.tsx
git commit -m "perf: rewire AdminGuests onto shared context, batched writes, and memoized rendering"
```

---

### Task 11: Rewire AdminInvites.tsx onto shared context, batched writes, and memoization

**Files:**
- Create: `src/components/admin/invites/InviteRow.tsx`
- Modify: `src/pages/admin/AdminInvites.tsx`

**Interfaces:**
- Consumes: `useGuests` (Task 4), `useInvites` (Task 7), `createInviteWithGuests`/`deleteInviteAndUnassignGuests` (Task 8), `useDebounce` (Task 2), `Guest` from `@/features/guests/types` (Task 3), `Invite`/`InviteWithCounts` from `@/features/invites/types` (Task 6).
- Produces: `InviteRow` (named export, `React.memo`'d).

Same reasoning as Task 10: read path, write path, and memoization are bundled into one task/commit so the file always compiles.

- [ ] **Step 1: Create InviteRow.tsx**

Create `src/components/admin/invites/InviteRow.tsx`:

```tsx
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Copy, Edit2, Trash2, MessageSquare } from 'lucide-react';
import type { Invite, InviteWithCounts } from '@/features/invites/types';

interface InviteRowProps {
  invite: InviteWithCounts;
  onCopyLink: (id: string) => void;
  onCopyMessage: (invite: Invite) => void;
  onEdit: (invite: InviteWithCounts) => void;
  onDelete: (id: string) => void;
}

function InviteRowComponent({ invite, onCopyLink, onCopyMessage, onEdit, onDelete }: InviteRowProps) {
  return (
    <TableRow className="group hover:bg-slate-50/50 transition-colors">
      <TableCell className="py-6 px-8 text-xs font-mono text-slate-400">
        {invite.import_order !== undefined ? invite.import_order + 1 : '-'}
      </TableCell>
      <TableCell className="py-6 px-8 font-semibold text-slate-700">{invite.name}</TableCell>
      <TableCell className="py-6 px-8 text-slate-500">{invite.guest_count} Guests</TableCell>
      <TableCell className="py-6 px-8">
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          invite.attending_count === invite.guest_count 
            ? 'bg-emerald-100 text-emerald-700' 
            : invite.attending_count > 0 
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
        }`}>
          {invite.attending_count} / {invite.guest_count} Joined
        </span>
      </TableCell>
      <TableCell className="py-6 px-8">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onCopyLink(invite.id)}
          title="Click to copy full link"
        >
          <code className="text-[10px] font-mono text-wedding-gold bg-wedding-gold/5 px-2 py-1 rounded truncate max-w-[150px]">
            ?inviteUrl={invite.id}
          </code>
          <Copy className="w-3 h-3 text-wedding-gold opacity-40" />
        </div>
      </TableCell>
      <TableCell className="py-6 px-8 text-right">
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onEdit(invite)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onCopyLink(invite.id)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onCopyMessage(invite)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onDelete(invite.id)}
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export const InviteRow = React.memo(InviteRowComponent);
```

- [ ] **Step 2: Replace AdminInvites.tsx's imports and type declarations**

In `src/pages/admin/AdminInvites.tsx`, replace lines 1–72 (everything from the top import through the end of the local `Guest` interface) with:

```tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, Upload, Download, FileSpreadsheet, Loader2, Search, Plus, Edit2, Trash2, UserPlus, X, ArrowUpDown, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  serverTimestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { generateInviteId } from '@/lib/utils';
import * as xlsx from 'xlsx';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuests } from '@/features/guests/context/GuestsProvider';
import { useInvites } from '@/features/invites/context/InvitesProvider';
import { createInviteWithGuests, deleteInviteAndUnassignGuests } from '@/features/invites/api/invitesApi';
import { useDebounce } from '@/hooks/useDebounce';
import { InviteRow } from '@/components/admin/invites/InviteRow';
import type { Guest } from '@/features/guests/types';
import type { Invite, InviteWithCounts } from '@/features/invites/types';
```

`addDoc` and `onSnapshot` are dropped from the firestore import: `addDoc`'s only call site (the bulk-import guest-creation loop) moves into `createInviteWithGuests`; `onSnapshot`'s two call sites are removed in Step 3. `QuerySnapshot` is dropped for the same reason as `onSnapshot`. `setDoc`, `updateDoc`, `deleteDoc`, `query`, `where`, `getDocs`, `getDoc` all remain imported because each is still used elsewhere in this file (`handleClearAllData`, `handleAddInvite`, `handleEditInvite`, `addGuestsToInvite`, `removeGuestFromInvite` — all out of scope for this plan, unchanged).

- [ ] **Step 3: Replace the component's data-source state and effects**

Find:

```tsx
export default function AdminInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
```

Replace with:

```tsx
export default function AdminInvites() {
  const { guests } = useGuests();
  const { invites, loading } = useInvites();
```

Find the combined data-fetching `useEffect`:

```tsx
  useEffect(() => {
    const unsubInvites = onSnapshot(collection(db, 'invites'), (snap: QuerySnapshot) => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'invites'));

    const unsubGuests = onSnapshot(collection(db, 'guests'), (snap: QuerySnapshot) => {
      const allGuests = snap.docs.map(d => ({ id: d.id, ...d.data() } as Guest));
      setGuests(allGuests);
      setUnassignedGuests(allGuests.filter(g => !g.invite_id));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'guests'));

    getDoc(doc(db, 'settings', 'invite_message_template')).then((snap: DocumentSnapshot) => {
      if (snap.exists()) {
        setMessageTemplate(snap.data().value);
      }
    });

    return () => {
      unsubInvites();
      unsubGuests();
    };
  }, []);

  useEffect(() => {
    if (editingInvite) {
      setInviteGuests(
        guests
          .filter(g => g.invite_id === editingInvite.id)
          .sort((a, b) => (a.import_order || 0) - (b.import_order || 0))
      );
    }
  }, [guests, editingInvite]);
```

Replace with:

```tsx
  useEffect(() => {
    getDoc(doc(db, 'settings', 'invite_message_template')).then((snap: DocumentSnapshot) => {
      if (snap.exists()) {
        setMessageTemplate(snap.data().value);
      }
    });
  }, []);

  const unassignedGuests = useMemo(() => guests.filter(g => !g.invite_id), [guests]);

  const inviteGuests = useMemo(() => {
    if (!editingInvite) return [];
    return guests
      .filter(g => g.invite_id === editingInvite.id)
      .sort((a, b) => (a.import_order || 0) - (b.import_order || 0));
  }, [guests, editingInvite]);
```

Then remove the now-redundant `useState` declarations for `unassignedGuests` and `inviteGuests` from the state block above (they're now `useMemo` values, not state). Find:

```tsx
  const [newInvite, setNewInvite] = useState({ id: '', name: '' });
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null);
  const [inviteGuests, setInviteGuests] = useState<Guest[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
```

Replace with:

```tsx
  const [newInvite, setNewInvite] = useState({ id: '', name: '' });
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
```

(`unassignedGuests`'s original `useState` declaration, higher up near `invites`/`guests`/`loading`, was already removed as part of the first replacement in this step.)

- [ ] **Step 4: Replace the write handlers**

Find `onDrop`'s inner loop:

```tsx
        let rowIndex = 0;
        for (const row of rows) {
          const inviteId = row.inviteId || generateInviteId();
          const name = row.inviteName || row.name;
          if (!name) continue;

          await setDoc(doc(db, 'invites', inviteId), {
            name,
            import_order: rowIndex++,
            created_at: serverTimestamp()
          }, { merge: true });

          const guestNames = row.guests ? String(row.guests).split(',').map((s: string) => s.trim()) : [row.name];
          let guestIndex = 0;
          for (const guestName of guestNames) {
            if (guestName) {
              await addDoc(collection(db, 'guests'), {
                name: guestName,
                invite_id: inviteId,
                role: row.role || null,
                is_coming: null,
                import_order: guestIndex++,
                updated_at: serverTimestamp()
              });
            }
          }
        }
        toast.success('Successfully imported invitations');
        setIsBulkOpen(false);
```

Replace with:

```tsx
        let rowIndex = 0;
        for (const row of rows) {
          const inviteId = row.inviteId || generateInviteId();
          const name = row.inviteName || row.name;
          if (!name) continue;

          const guestNames = row.guests ? String(row.guests).split(',').map((s: string) => s.trim()) : [row.name];
          await createInviteWithGuests(
            inviteId,
            { name, import_order: rowIndex++ },
            guestNames,
            row.role || null
          );
        }
        toast.success('Successfully imported invitations');
        setIsBulkOpen(false);
```

(This reduces each row from `1 + guestNames.length` sequential Firestore round trips down to exactly 1. The outer per-row loop is unchanged — it drives file-parsing logic, not the diagnosed N+1 problem.)

Find `handleDeleteInvite`:

```tsx
  const handleDeleteInvite = async (id: string) => {
    console.log('Delete button clicked for:', id);
    try {
      // Unassign guests
      const inviteGuestsRef = query(collection(db, 'guests'), where('invite_id', '==', id));
      const snap = await getDocs(inviteGuestsRef);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'guests', d.id), { invite_id: null });
      }
      // Delete invite
      await deleteDoc(doc(db, 'invites', id));
      toast.success('Invitation deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `invites/${id}`);
      toast.error('Failed to delete invitation');
    }
  };
```

Replace with:

```tsx
  const handleDeleteInvite = useCallback(async (id: string) => {
    try {
      await deleteInviteAndUnassignGuests(id);
      toast.success('Invitation deleted');
    } catch (err) {
      toast.error('Failed to delete invitation');
    }
  }, []);
```

(The stray `console.log` debug leftover is removed — it served no purpose and its only call site is the function being rewritten here. `handleFirestoreError` is no longer called at this level since `deleteInviteAndUnassignGuests` already calls it internally, matching this plan's Global Constraints.)

Find `copyLink`:

```tsx
  const copyLink = (id: string) => {
    const url = `${window.location.origin}/?inviteUrl=${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard');
  };
```

Replace with:

```tsx
  const copyLink = useCallback((id: string) => {
    const url = `${window.location.origin}/?inviteUrl=${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard');
  }, []);
```

Find `copyMessage`:

```tsx
  const copyMessage = (invite: Invite) => {
    const message = messageTemplate
      .replace('<name>', invite.name)
      .replace('<link>', `${window.location.origin}/?inviteUrl=${invite.id}`);
    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard');
  };
```

Replace with:

```tsx
  const copyMessage = useCallback((invite: Invite) => {
    const message = messageTemplate
      .replace('<name>', invite.name)
      .replace('<link>', `${window.location.origin}/?inviteUrl=${invite.id}`);
    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard');
  }, [messageTemplate]);
```

Add a new stable edit-click handler, placed after `copyMessage`:

```tsx
  const handleEditClick = useCallback((invite: InviteWithCounts) => {
    setEditingInvite(invite);
    setIsEditOpen(true);
  }, []);
```

Leave `handleClearAllData`, `handleAddInvite`, `handleEditInvite`, `addGuestsToInvite`, `removeGuestFromInvite` completely untouched — none of the 5 diagnosed sequential-write sites are in these functions, and none are passed to `InviteRow`.

- [ ] **Step 5: Memoize the derived-state pipeline**

Find:

```tsx
  const invitesWithCounts = invites.map(invite => {
    const inviteGuestsList = guests.filter(g => g.invite_id === invite.id);
    return {
      ...invite,
      guest_count: inviteGuestsList.length,
      attending_count: inviteGuestsList.filter(g => (g as any).is_coming === true).length
    };
  });

  const filteredInvites = invitesWithCounts.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || 
                         i.id.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'completed') return i.attending_count === i.guest_count && i.guest_count > 0;
    if (statusFilter === 'partial') return i.attending_count > 0 && i.attending_count < i.guest_count;
    if (statusFilter === 'empty') return i.attending_count === 0;
    
    return true;
  });

  const sortedInvites = [...filteredInvites].sort((a, b) => {
    const getSortValue = (val: any) => {
      if (val === null || val === undefined) return -Infinity;
      if (val?.seconds) return val.seconds;
      if (val instanceof Date) return val.getTime();
      return val;
    };

    let aValue = getSortValue(a[sortField as keyof typeof a]);
    let bValue = getSortValue(b[sortField as keyof typeof b]);

    let comparison = 0;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      comparison = aStr.localeCompare(bStr);
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
```

Replace with:

```tsx
  const debouncedSearch = useDebounce(search, 300);

  const sortedInvites = useMemo((): InviteWithCounts[] => {
    const invitesWithCounts: InviteWithCounts[] = invites.map(invite => {
      const inviteGuestsList = guests.filter(g => g.invite_id === invite.id);
      return {
        ...invite,
        guest_count: inviteGuestsList.length,
        attending_count: inviteGuestsList.filter(g => g.is_coming === true).length
      };
    });

    const filteredInvites = invitesWithCounts.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                           i.id.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      if (!matchesSearch) return false;

      if (statusFilter === 'completed') return i.attending_count === i.guest_count && i.guest_count > 0;
      if (statusFilter === 'partial') return i.attending_count > 0 && i.attending_count < i.guest_count;
      if (statusFilter === 'empty') return i.attending_count === 0;
      
      return true;
    });

    return [...filteredInvites].sort((a, b) => {
      const getSortValue = (val: any) => {
        if (val === null || val === undefined) return -Infinity;
        if (val?.seconds) return val.seconds;
        if (val instanceof Date) return val.getTime();
        return val;
      };

      let aValue = getSortValue(a[sortField as keyof typeof a]);
      let bValue = getSortValue(b[sortField as keyof typeof b]);

      let comparison = 0;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        comparison = aStr.localeCompare(bStr);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [invites, guests, debouncedSearch, statusFilter, sortField, sortDirection]);
```

`(g as any).is_coming` becomes plain `g.is_coming` — the `as any` cast is no longer needed now that `guests` is typed via the shared `Guest` type (which declares `is_coming: boolean | null`) instead of the file's old minimal local `Guest` interface.

Update the `sortField` state's type declaration. Find:

```tsx
  const [sortField, setSortField] = useState<keyof Invite | 'guest_count' | 'attending_count'>('import_order');
```

Replace with:

```tsx
  const [sortField, setSortField] = useState<keyof InviteWithCounts>('import_order');
```

`totalPages`/`paginatedInvites` (unchanged, still derive from `sortedInvites`) and `handleSort`'s signature — find:

```tsx
  const handleSort = (field: keyof Invite | 'guest_count' | 'attending_count') => {
```

replace with:

```tsx
  const handleSort = (field: keyof InviteWithCounts) => {
```

— the body of `handleSort` is unchanged.

- [ ] **Step 6: Replace the inline row JSX with `<InviteRow>`**

Find the table body's row-mapping branch:

```tsx
            ) : paginatedInvites.map((invite) => (
              <TableRow key={invite.id} className="group hover:bg-slate-50/50 transition-colors">
```

...through its matching closing `</TableRow>` and `))}`.

Replace the entire `paginatedInvites.map((invite) => ( <TableRow>...</TableRow> ))` expression with:

```tsx
            ) : paginatedInvites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                onCopyLink={copyLink}
                onCopyMessage={copyMessage}
                onEdit={handleEditClick}
                onDelete={handleDeleteInvite}
              />
            ))}
```

Everything else (header, dialogs, filters, pagination, the edit-invite dialog with its guest-assignment UI) is unchanged.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors/warnings.

Run: `npm run dev`, log into `/admin/invites`.
Expected: page loads, table renders identically to before, search/filter/sort/pagination work, add/edit/delete invite work, bulk Excel import/export work, the edit dialog's guest-assignment UI (add from pool, remove from invite) works. Delete an invite that has guests assigned and confirm those guests show `invite_id: null` afterward (via `/admin/guests`) and the invite doc is gone — same end-state as before, now via one batched operation instead of a sequential loop.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/invites/InviteRow.tsx src/pages/admin/AdminInvites.tsx
git commit -m "perf: rewire AdminInvites onto shared context, batched writes, and memoized rendering"
```

---

### Task 12: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full-codebase checks**

Run: `npx tsc --noEmit` (whole project)
Expected: no errors.

Run: `npm run lint` (whole project)
Expected: no errors/warnings.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 2: Confirm single-subscription behavior**

With `npm run dev` running and logged into `/admin`, navigate `/admin/guests` → `/admin/invites` → `/admin/guests` → `/admin/invites` several times in a row. There is no browser automation available in this environment — do this check via code reading rather than a live click-through: confirm `GuestsProvider`/`InvitesProvider` are mounted only once, at `AdminLayout`'s `<Outlet />` wrap (Task 9), and that neither `AdminGuests.tsx` nor `AdminInvites.tsx` contains an `onSnapshot` call after Tasks 10–11 (`grep -rn "onSnapshot" src/pages/admin/AdminGuests.tsx src/pages/admin/AdminInvites.tsx` should return nothing) — since a listener's lifecycle is tied to where its `useEffect` lives, and that `useEffect` now lives only in the two provider components (which sit above the routed `<Outlet />`, not inside it), navigating between the two pages cannot re-trigger it. A human with a browser should still confirm this live (Firestore usage dashboard or Network tab) before treating it as fully verified in production.

- [ ] **Step 3: Confirm no remaining sequential-write loops**

Run: `grep -n "for (const" src/pages/admin/AdminGuests.tsx src/pages/admin/AdminInvites.tsx -A2 | grep -B2 "await "`
Expected: no output (the 5 sites diagnosed in the design spec are all gone — 3 from `AdminGuests.tsx`, 2 from `AdminInvites.tsx`). Any remaining `for (const ...)` loops in these files (if grep still finds bare `for` loops without an immediately-following `await`) are pre-existing, out-of-scope, non-Firestore loops — confirm any hits are not Firestore writes before treating this check as failed.

- [ ] **Step 4: Record results**

Append a `## Results` section to `docs/superpowers/specs/2026-07-31-admin-guests-invites-data-layer-design.md` summarizing: the tsc/lint/build results, confirmation that both files no longer call `onSnapshot` directly, confirmation that grep finds no remaining sequential-write loops in either file, and an explicit note that a human should do a live browser walkthrough (bulk actions, invite create/delete, search-while-typing smoothness) before treating this as fully verified in production — consistent with sub-project 1's Results section.

Then commit:

```bash
git add docs/superpowers/specs/2026-07-31-admin-guests-invites-data-layer-design.md
git commit -m "docs: record admin guests/invites data layer results"
```
