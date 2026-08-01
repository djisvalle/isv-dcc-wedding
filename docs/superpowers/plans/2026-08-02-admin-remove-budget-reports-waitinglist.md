# Remove Budget, Reports & Waiting List Admin Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Budget & Payments, Reports, and Waiting List admin pages — including the "Move to Waiting List" workflow embedded in the Guest List page and the now-orphaned sub-project 2b data layer (`SuppliersProvider`/`PaymentsProvider`/`WaitingListProvider`) — leaving Firestore data/rules untouched.

**Architecture:** Pure removal — no new files, no new patterns. Delete the three page files and their routes/nav entries; strip the waiting-list bulk-action/quick-action code out of `AdminGuests.tsx`/`GuestRow.tsx`/`guestsApi.ts`; revert `AdminLayout.tsx`'s provider nesting to just `GuestsProvider`/`InvitesProvider`; delete the two now-empty feature folders (`src/features/budget/`, `src/features/waitingList/`) in full.

**Tech Stack:** React 18, TypeScript, React Router, Vite (unchanged — no new dependencies, no dependency removals).

## Global Constraints

- `firestore.rules` and the `suppliers`/`payments`/`waiting_list`/`settings` Firestore collections/documents stay untouched — orphaned but harmless.
- `AdminDashboard`, `AdminTables`, `AdminSettings`, `GuestsProvider`, `InvitesProvider` are unaffected — do not touch them beyond what's explicitly listed.
- The `table_order` field on the shared `Guest` type (added in sub-project 2b for `AdminTables`) stays — unrelated to this removal.
- Manual verification only: `npx tsc --noEmit` + `npm run build` + `npx eslint . --report-unused-disable-directives --max-warnings 0` are the test signal. No test runner is introduced.

---

### Task 1: Remove the "Move to Waiting List" workflow from the Guest List page

**Files:**
- Modify: `src/features/guests/api/guestsApi.ts`
- Modify: `src/pages/admin/AdminGuests.tsx`
- Modify: `src/components/admin/guests/GuestRow.tsx`

**Interfaces:**
- Removes: `batchMoveToWaitingList` and `WaitingListEntry` from `guestsApi.ts` (no other file imports either — confirmed by repo-wide grep during design).
- Removes: the `onMoveToWaiting` prop from `GuestRowProps`.

- [ ] **Step 1: Remove `batchMoveToWaitingList` from `guestsApi.ts`**

The file currently ends with these two exports (after `batchImportGuests`):

```ts
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

Delete both the `WaitingListEntry` interface and the `batchMoveToWaitingList` function. Nothing else in the file changes — `batchDeleteGuests`, `batchUpdateGuestStatus`, `GuestImportRow`, and `batchImportGuests` all stay exactly as they are, and all still use `doc`, `collection`, `serverTimestamp`, `db`, `handleFirestoreError`, `OperationType`, `commitInChunks` — so no imports change in this file.

- [ ] **Step 2: Remove the waiting-list handler and its import from `AdminGuests.tsx`**

Current import line:
```tsx
import { batchDeleteGuests, batchUpdateGuestStatus, batchImportGuests, batchMoveToWaitingList } from '@/features/guests/api/guestsApi';
```
Replace with:
```tsx
import { batchDeleteGuests, batchUpdateGuestStatus, batchImportGuests } from '@/features/guests/api/guestsApi';
```

Current `Hourglass` import line:
```tsx
import { Check, ChevronsUpDown, Hourglass } from "lucide-react";
```
Replace with:
```tsx
import { Check, ChevronsUpDown } from "lucide-react";
```
(`Hourglass` has exactly one use site in this file — the bulk-action button removed in Step 3 below — so it becomes fully unused.)

Current handler (delete this whole block):
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
    } catch {
      toast.error('Failed to move guests');
    }
  }, [guests]);
```

- [ ] **Step 3: Remove the bulk-action button from `AdminGuests.tsx`**

Current JSX (inside the `selectedIds.length > 0` bulk-action bar, between the "Decline"/"Clear" buttons and the "Delete" button):
```tsx
              <Button onClick={() => handleMoveToWaitingList(selectedIds)} variant="outline" className="text-amber-600 border-amber-100 hover:bg-amber-50">
                <Hourglass className="w-4 h-4 mr-2" />
                Move to Waiting List
              </Button>
```
Delete this block entirely. The surrounding buttons ("Attend", "Decline", "Clear", "Delete") are untouched.

- [ ] **Step 4: Remove the `onMoveToWaiting` prop passed to `GuestRow` in `AdminGuests.tsx`**

Current:
```tsx
              <GuestRow
                key={guest.id}
                guest={guest}
                selected={selectedIds.includes(guest.id)}
                onToggleSelect={toggleSelect}
                onUpdateStatus={handleUpdateStatus}
                onMoveToWaiting={handleMoveToWaitingList}
                onUpdateField={onUpdateField}
                onEdit={handleEditClick}
                onDelete={handleDeleteGuest}
                onCopyMessage={copyMessage}
              />
```
Remove the `onMoveToWaiting={handleMoveToWaitingList}` line. Every other prop stays.

- [ ] **Step 5: Remove `onMoveToWaiting` from `GuestRow.tsx`'s props interface and destructuring**

Current interface:
```tsx
interface GuestRowProps {
  guest: Guest & { invite_name?: string | null };
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateStatus: (ids: string[], status: boolean | null) => void;
  onMoveToWaiting: (ids: string[]) => void;
  onUpdateField: (id: string, field: 'name' | 'nickname', value: string) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (id: string) => void;
  onCopyMessage: (guest: Guest) => void;
}
```
Remove the `onMoveToWaiting: (ids: string[]) => void;` line.

Current destructuring:
```tsx
function GuestRowComponent({
  guest,
  selected,
  onToggleSelect,
  onUpdateStatus,
  onMoveToWaiting,
  onUpdateField,
  onEdit,
  onDelete,
  onCopyMessage,
}: GuestRowProps) {
```
Remove the `onMoveToWaiting,` line.

- [ ] **Step 6: Remove the per-row quick-action button and the `Hourglass` import in `GuestRow.tsx`**

Current import:
```tsx
import { Copy, UserCheck, UserX, UserMinus, Edit2, Trash2, MessageSquare, Hourglass } from 'lucide-react';
```
Replace with:
```tsx
import { Copy, UserCheck, UserX, UserMinus, Edit2, Trash2, MessageSquare } from 'lucide-react';
```

Current JSX (the first button inside the final `TableCell`'s action button group, before the Edit button):
```tsx
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMoveToWaiting([guest.id])}
            className="text-slate-400 hover:text-amber-600 hover:bg-amber-50"
            title="Move to Waiting List"
          >
            <Hourglass className="w-4 h-4" />
          </Button>
```
Delete this block. The Edit/Delete/Copy Message buttons that follow it are untouched.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/features/guests/api/guestsApi.ts src/pages/admin/AdminGuests.tsx src/components/admin/guests/GuestRow.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output (clean — confirms no leftover unused imports/vars from the removed code).

- [ ] **Step 8: Commit**

```bash
git add src/features/guests/api/guestsApi.ts src/pages/admin/AdminGuests.tsx src/components/admin/guests/GuestRow.tsx
git commit -m "refactor: remove Move to Waiting List workflow from Guest List page"
```

---

### Task 2: Remove the three admin pages — files, routes, nav items, provider wiring

**Files:**
- Delete: `src/pages/admin/AdminBudget.tsx`
- Delete: `src/pages/admin/AdminReports.tsx`
- Delete: `src/pages/admin/AdminWaitingList.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: nothing new.
- Removes: the `/admin/budget`, `/admin/reports`, `/admin/waiting-list` routes; the `SuppliersProvider`/`PaymentsProvider`/`WaitingListProvider` mount points in `AdminLayout` (their source files are deleted in Task 3 — this task only stops referencing them).

- [ ] **Step 1: Delete the three page files**

```bash
git rm src/pages/admin/AdminBudget.tsx src/pages/admin/AdminReports.tsx src/pages/admin/AdminWaitingList.tsx
```

- [ ] **Step 2: Remove their lazy imports and routes from `App.tsx`**

Current (near the top, among the other `lazy()` declarations):
```tsx
const AdminBudget = lazy(() => import('@/pages/admin/AdminBudget'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminWaitingList = lazy(() => import('@/pages/admin/AdminWaitingList'));
```
Delete these three lines. `AdminLayout`, `AdminDashboard`, `AdminInvites`, `AdminGuests`, `AdminTables`, `AdminSettings`, `AdminLogin` lazy declarations stay.

Current (inside the `<Route path="/admin" element={<AdminLayout />}>` block):
```tsx
              <Route path="waiting-list" element={<AdminWaitingList />} />
              <Route path="budget" element={<AdminBudget />} />
              <Route path="reports" element={<AdminReports />} />
```
Delete these three `<Route>` lines. The `index`, `invites`, `guests`, `tables`, and `settings` routes stay unchanged, in their existing order.

- [ ] **Step 3: Remove the three nav items and their icon imports from `AdminLayout.tsx`**

Current lucide-react import:
```tsx
import { 
  Users, 
  Ticket, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  Loader2,
  Settings,
  LayoutGrid,
  Wallet,
  BarChart3,
  Hourglass
} from 'lucide-react';
```
Replace with:
```tsx
import { 
  Users, 
  Ticket, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  Loader2,
  Settings,
  LayoutGrid
} from 'lucide-react';
```
(`Wallet`, `BarChart3`, `Hourglass` were each used only in the `navItems` entries removed below.)

Current `navItems` array:
```tsx
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Invitations', icon: Ticket, path: '/admin/invites' },
    { label: 'Guest List', icon: Users, path: '/admin/guests' },
    { label: 'Waiting List', icon: Hourglass, path: '/admin/waiting-list' },
    { label: 'Tables', icon: LayoutGrid, path: '/admin/tables' },
    { label: 'Budget & Payments', icon: Wallet, path: '/admin/budget' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];
```
Replace with:
```tsx
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Invitations', icon: Ticket, path: '/admin/invites' },
    { label: 'Guest List', icon: Users, path: '/admin/guests' },
    { label: 'Tables', icon: LayoutGrid, path: '/admin/tables' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];
```
This single array feeds both the desktop sidebar nav and the mobile sheet nav (both `.map(navItems...)` call sites read from it) — one edit covers both.

- [ ] **Step 4: Remove the three new-provider imports and un-wrap them in `AdminLayout.tsx`**

Current imports:
```tsx
import { GuestsProvider } from '@/features/guests/context/GuestsProvider';
import { InvitesProvider } from '@/features/invites/context/InvitesProvider';
import { SuppliersProvider } from '@/features/budget/context/SuppliersProvider';
import { PaymentsProvider } from '@/features/budget/context/PaymentsProvider';
import { WaitingListProvider } from '@/features/waitingList/context/WaitingListProvider';
```
Replace with:
```tsx
import { GuestsProvider } from '@/features/guests/context/GuestsProvider';
import { InvitesProvider } from '@/features/invites/context/InvitesProvider';
```

Current JSX (inside `<main>`):
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
Replace with:
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
This is exactly the provider nesting `AdminLayout.tsx` had before sub-project 2b's Task 4 added the three new providers.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors — this is the step most likely to catch a leftover reference, since `App.tsx` and `AdminLayout.tsx` no longer import the deleted page/provider files.
Run: `npx eslint src/App.tsx src/components/admin/AdminLayout.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output (clean).
Run: `npm run build`
Expected: succeeds — confirms Vite's module graph has no dangling import to a deleted file (this is exactly the kind of break `tsc`/`eslint` alone can miss if a dynamic `import()` string wasn't caught).

- [ ] **Step 6: Commit**

```bash
git add -A src/pages/admin/AdminBudget.tsx src/pages/admin/AdminReports.tsx src/pages/admin/AdminWaitingList.tsx src/App.tsx src/components/admin/AdminLayout.tsx
git commit -m "refactor: remove Budget, Reports, and Waiting List admin pages"
```

---

### Task 3: Delete the orphaned `budget` and `waitingList` feature folders

**Files:**
- Delete: `src/features/budget/types.ts`
- Delete: `src/features/budget/context/SuppliersProvider.tsx`
- Delete: `src/features/budget/context/PaymentsProvider.tsx`
- Delete: `src/features/waitingList/types.ts`
- Delete: `src/features/waitingList/context/WaitingListProvider.tsx`

**Interfaces:** none — after Task 2, nothing in `src/` imports from either folder (confirmed by the repo-wide grep run during design, which found only the files this plan's three tasks touch).

- [ ] **Step 1: Confirm nothing still references either folder**

Run:
```bash
grep -rn "features/budget\|features/waitingList" src/
```
Expected: no output. If this returns any hit, stop and investigate before deleting — it means Task 1 or Task 2 missed a reference.

- [ ] **Step 2: Delete both folders**

```bash
git rm -r src/features/budget src/features/waitingList
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint . --report-unused-disable-directives --max-warnings 0`
Expected: no output.
Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A src/features/budget src/features/waitingList
git commit -m "chore: delete orphaned budget and waitingList feature folders"
```

---

### Task 4: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: zero errors, zero output.

- [ ] **Step 2: Full lint**

Run: `npx eslint . --report-unused-disable-directives --max-warnings 0`
Expected: zero errors, zero warnings, zero output.

- [ ] **Step 3: Full production build**

Run: `npm run build`
Expected: succeeds. Note that `AdminBudget`, `AdminReports`, and `AdminWaitingList` no longer appear as separate chunks in the build output, and `AdminGuests`'s chunk should be marginally smaller (dead code removed).

- [ ] **Step 4: Grep sweep for every removed symbol/path**

Run:
```bash
grep -rn "AdminBudget\|AdminReports\|AdminWaitingList\|batchMoveToWaitingList\|WaitingListEntry\|onMoveToWaiting\|SuppliersProvider\|PaymentsProvider\|WaitingListProvider\|features/budget\|features/waitingList" src/
```
Expected: no output.

Run:
```bash
grep -n "'waiting-list'\|'budget'\|'reports'" src/App.tsx
```
Expected: no output.

- [ ] **Step 5: Manually confirm the nav item count**

Read `src/components/admin/AdminLayout.tsx` and confirm `navItems` has exactly 5 entries: Dashboard, Invitations, Guest List, Tables, Settings — in that order.

- [ ] **Step 6: Update the design spec with a Results section**

Append a `## Results` section to
`docs/superpowers/specs/2026-08-02-admin-remove-budget-reports-waitinglist-design.md`,
following the format of the `## Results` sections already present in this
project's other specs (e.g.
`docs/superpowers/specs/2026-08-01-admin-remaining-pages-data-layer-design.md`) —
cover what was verified, the tsc/eslint/build output summary, the grep
sweep commands and their empty output, the nav-item count confirmation,
and a short "not verified — no browser automation available" list (a
human should click through the admin nav to confirm the 3 removed pages
are gone and the Guest List page's remaining bulk/row actions still work).

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-08-02-admin-remove-budget-reports-waitinglist-design.md
git commit -m "docs: record removal verification results"
```
