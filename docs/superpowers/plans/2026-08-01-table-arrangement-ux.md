# Table Arrangement UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add filters, per-table capacity, bulk assign, print/export, and interaction polish to the Table Arrangement admin page (`src/pages/admin/AdminTables.tsx`), per `docs/superpowers/specs/2026-08-01-table-arrangement-ux-design.md`.

**Architecture:** Build every feature directly inside the existing (currently monolithic) `AdminTables.tsx` first, verifying each increment in the browser. Once the feature set is stable and correct, do a final mechanical extraction pass moving `SortableGuestItem`, `DroppableTable`, and `UnassignedContainer` into their own files under `src/components/admin/tables/`, mirroring the existing `src/components/admin/guests/GuestRow.tsx` precedent. This ordering means every early task only touches one file (lower risk, easy to verify), and the late extraction tasks are pure, mechanically-verifiable moves.

**Tech Stack:** React 18, TypeScript, `@dnd-kit` (existing drag-and-drop), Firebase Firestore, Tailwind CSS, `sonner` toasts, existing `@/components/ui/*` primitives (Button, Input, Label, Dialog, Sheet, DropdownMenu, Checkbox).

## Global Constraints

- No test framework exists in this project (no vitest/jest, no `*.test.*` files anywhere) — do not introduce one. Verification is: `npx tsc --noEmit` (types), `npm run lint` (must pass with zero warnings — `eslint . --max-warnings 0`), and manual browser verification via `npm run dev` at `http://localhost:3000/admin/tables` (requires logging in at `/admin/login` first).
- Capacity is a **soft guide, not a hard limit** — never block a drag, quick-move, quick-assign, or bulk-assign action because a table is over capacity. Only show a visual warning.
- Default capacities: **regular → 10**, **VIP → 6**, **bridal → uncapped**. All are editable per-table afterward, and clearing the field means uncapped.
- Filters shape what's *visible*; they never remove a table from destination pickers (quick-move dropdown, quick-assign dialog, bulk-assign dropdown always list every active table).
- Stat tiles (header "Tables" / "Unassigned" counts) and the mobile FAB badge always show true totals, never filtered counts.
- Match existing code style exactly: Tailwind utility classes in the same idiom already used in this file (rounded-3xl/rounded-xl cards, `wedding-gold` accent color, `text-[10px] uppercase tracking-widest font-bold` label style, etc.), and the `DropdownMenuTrigger render={...}` (not `asChild`) pattern already used in this file for `@base-ui/react`-backed dropdowns.
- Every task must leave `npm run lint` and `npx tsc --noEmit` clean — no unused imports, no unused variables. Watch for imports that become unused after code moves (e.g. `setDoc`).

---

## Task 1: Extract table domain types/helpers, add `capacity` field

**Files:**
- Create: `src/components/admin/tables/types.ts`
- Modify: `src/pages/admin/AdminTables.tsx`

**Interfaces:**
- Produces: `Table` interface (`{ id: string; type: 'bridal'|'vip'|'regular'; number: string; capacity?: number }`), `TABLE_TYPES` const, `TABLE_LAYOUT_SETTING_ID` const, `sortTables(tables: Table[]): Table[]`, `mergeTables(...lists: Table[][]): Table[]`, `persistTableLayout(tables: Table[]): Promise<void>`.

- [ ] **Step 1: Create `src/components/admin/tables/types.ts`**

```ts
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';

export interface Table {
  id: string; // key: type-number
  type: 'bridal' | 'vip' | 'regular';
  number: string;
  capacity?: number; // undefined = uncapped
}

export const TABLE_TYPES = [
  { id: 'bridal', label: 'Bridal Table' },
  { id: 'vip', label: 'VIP Table' },
  { id: 'regular', label: 'Regular Table' }
] as const;

const TABLE_TYPE_ORDER = ['bridal', 'vip', 'regular'];

export function sortTables(tables: Table[]): Table[] {
  return [...tables].sort((a, b) => {
    const aOrder = TABLE_TYPE_ORDER.indexOf(a.type);
    const bOrder = TABLE_TYPE_ORDER.indexOf(b.type);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
  });
}

/** Dedupes by id (first occurrence wins) across any number of table lists, then sorts. */
export function mergeTables(...lists: Table[][]): Table[] {
  const byId: Record<string, Table> = {};
  for (const list of lists) {
    for (const t of list) {
      if (!byId[t.id]) byId[t.id] = t;
    }
  }
  return sortTables(Object.values(byId));
}

export const TABLE_LAYOUT_SETTING_ID = 'table_layout';

/**
 * Tables with guests seated are re-derivable from the guests themselves, but
 * an empty table (created ahead of assigning anyone) only exists in local
 * component state — so it silently disappeared on refresh. Persisting the
 * full active table list here means empty tables survive a reload.
 */
export async function persistTableLayout(tables: Table[]) {
  try {
    await setDoc(doc(db, 'settings', TABLE_LAYOUT_SETTING_ID), {
      key: TABLE_LAYOUT_SETTING_ID,
      value: JSON.stringify(tables.map(({ id, type, number, capacity }) => ({ id, type, number, capacity }))),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `settings/${TABLE_LAYOUT_SETTING_ID}`);
  }
}
```

- [ ] **Step 2: In `AdminTables.tsx`, remove `setDoc` from the firestore import (now unused here)**

Change:
```ts
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
```
to:
```ts
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
```

- [ ] **Step 3: In `AdminTables.tsx`, add the new import**

Add, near the other local imports (after the `useGuests`/`commitInChunks`/`Guest` imports):
```ts
import { Table, TABLE_TYPES, mergeTables, TABLE_LAYOUT_SETTING_ID, persistTableLayout } from '@/components/admin/tables/types';
```

- [ ] **Step 4: In `AdminTables.tsx`, delete the now-duplicated local definitions**

Delete this entire block (the `interface Table`, `TABLE_TYPES`, `TABLE_TYPE_ORDER`, `sortTables`, `mergeTables`, `TABLE_LAYOUT_SETTING_ID`, `persistTableLayout` definitions that currently sit between the imports and `// --- Sub-components for DnD ---`):

```ts
interface Table {
  id: string; // key: type-number
  type: 'bridal' | 'vip' | 'regular';
  number: string;
}

const TABLE_TYPES = [
  { id: 'bridal', label: 'Bridal Table' },
  { id: 'vip', label: 'VIP Table' },
  { id: 'regular', label: 'Regular Table' }
] as const;

const EMPTY_GUESTS: Guest[] = [];
const TABLE_TYPE_ORDER = ['bridal', 'vip', 'regular'];

function sortTables(tables: Table[]): Table[] { /* ... */ }

/** Dedupes by id (first occurrence wins) across any number of table lists, then sorts. */
function mergeTables(...lists: Table[][]): Table[] { /* ... */ }

const TABLE_LAYOUT_SETTING_ID = 'table_layout';

/**
 * Tables with guests seated are re-derivable from the guests themselves, but
 * an empty table (created ahead of assigning anyone) only exists in local
 * component state — so it silently disappeared on refresh. Persisting the
 * full active table list here means empty tables survive a reload.
 */
async function persistTableLayout(tables: Table[]) { /* ... */ }
```

Keep `const EMPTY_GUESTS: Guest[] = [];` — it stays in `AdminTables.tsx` (it's a page-local memoization helper, not a table domain concept). Re-add it as a standalone line where the deleted block was.

- [ ] **Step 5: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no warnings/errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in at `http://localhost:3000/admin/login`, navigate to `http://localhost:3000/admin/tables`.
Confirm: page loads exactly as before, tables render, drag-and-drop between tables still works, "Add Table" and empty-table delete still work, and refreshing the page still shows any manually-added empty tables (layout persistence unaffected).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/tables/types.ts src/pages/admin/AdminTables.tsx
git commit -m "refactor: extract table types/helpers, add capacity field to Table"
```

---

## Task 2: Capacity status helper module

**Files:**
- Create: `src/components/admin/tables/capacity.ts`

**Interfaces:**
- Consumes: `Table` type from `./types` (Task 1).
- Produces: `CapacityStatus` type (`'none'|'room'|'full'|'over'`), `DEFAULT_CAPACITY: Record<Table['type'], number | undefined>`, `getEffectiveCapacity(table: Pick<Table,'type'|'capacity'>): number | undefined`, `getCapacityStatus(occupants: number, capacity: number | undefined): CapacityStatus`.

- [ ] **Step 1: Create `src/components/admin/tables/capacity.ts`**

```ts
import type { Table } from './types';

export type CapacityStatus = 'none' | 'room' | 'full' | 'over';

export const DEFAULT_CAPACITY: Record<Table['type'], number | undefined> = {
  bridal: undefined,
  vip: 6,
  regular: 10,
};

/** Falls back to the type's default when the table has no explicit capacity set. */
export function getEffectiveCapacity(table: Pick<Table, 'type' | 'capacity'>): number | undefined {
  return table.capacity ?? DEFAULT_CAPACITY[table.type];
}

export function getCapacityStatus(occupants: number, capacity: number | undefined): CapacityStatus {
  if (capacity === undefined) return 'none';
  if (occupants > capacity) return 'over';
  if (occupants === capacity) return 'full';
  return 'room';
}
```

This module isn't consumed yet — Task 3 and Task 4 wire it in.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` and `npm run lint`.
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/tables/capacity.ts
git commit -m "feat: add table capacity status helpers"
```

---

## Task 3: Add Table dialog — capacity field with type-based defaults

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`

**Interfaces:**
- Consumes: `DEFAULT_CAPACITY` from `@/components/admin/tables/capacity` (Task 2).

- [ ] **Step 1: Import the capacity helper**

Add to the imports in `AdminTables.tsx`:
```ts
import { DEFAULT_CAPACITY } from '@/components/admin/tables/capacity';
```

- [ ] **Step 2: Change `newTable` state to include a capacity draft string**

Replace:
```ts
const [newTable, setNewTable] = useState<{ type: 'bridal' | 'vip' | 'regular', number: string }>({ type: 'regular', number: '' });
```
with:
```ts
const [newTable, setNewTable] = useState<{ type: Table['type']; number: string; capacity: string }>({
  type: 'regular',
  number: '',
  capacity: String(DEFAULT_CAPACITY.regular ?? '')
});
```

- [ ] **Step 3: Update the table-type `<select>` in the Add Table dialog to re-derive the capacity default on type change**

Find the type `<select>` inside the Add Table `<Dialog>`:
```tsx
<select 
  className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
  value={newTable.type} 
  onChange={e => setNewTable(prev => ({ ...prev, type: e.target.value as any }))}
>
```
Replace its `onChange` with:
```tsx
onChange={e => {
  const type = e.target.value as Table['type'];
  setNewTable(prev => {
    const wasAtDefault = prev.capacity === String(DEFAULT_CAPACITY[prev.type] ?? '');
    return {
      ...prev,
      type,
      capacity: wasAtDefault ? String(DEFAULT_CAPACITY[type] ?? '') : prev.capacity
    };
  });
}}
```
(This re-derives the shown default only if the user hasn't hand-edited the capacity field away from its previous type's default — so a manual override survives switching table type.)

- [ ] **Step 4: Add a Capacity field to the dialog form**

Directly after the "Table Number/Identifier" field's closing `</div>` and before the submit `<Button>`, add:
```tsx
<div className="space-y-2">
  <Label>Capacity</Label>
  <Input
    type="number"
    min={1}
    value={newTable.capacity}
    onChange={e => setNewTable(prev => ({ ...prev, capacity: e.target.value }))}
    placeholder="Uncapped"
  />
</div>
```

- [ ] **Step 5: Update `handleAddTable` to parse and persist capacity**

Replace:
```ts
const handleAddTable = (e: React.FormEvent) => {
  e.preventDefault();
  const id = `${newTable.type}-${newTable.number}`;
  if (activeTables.find(t => t.id === id)) {
    toast.error('This table already exists');
    return;
  }
  const updated = mergeTables(activeTables, [{ id, ...newTable }]);
  setActiveTables(updated);
  persistTableLayout(updated);
  setIsAddTableOpen(false);
  setNewTable({ type: 'regular', number: '' });
  toast.success('Table added');
};
```
with:
```ts
const handleAddTable = (e: React.FormEvent) => {
  e.preventDefault();
  const id = `${newTable.type}-${newTable.number}`;
  if (activeTables.find(t => t.id === id)) {
    toast.error('This table already exists');
    return;
  }
  const parsedCapacity = newTable.capacity.trim() === '' ? undefined : parseInt(newTable.capacity, 10);
  const capacity = parsedCapacity !== undefined && !Number.isNaN(parsedCapacity) && parsedCapacity > 0
    ? parsedCapacity
    : undefined;
  const updated = mergeTables(activeTables, [{ id, type: newTable.type, number: newTable.number, capacity }]);
  setActiveTables(updated);
  persistTableLayout(updated);
  setIsAddTableOpen(false);
  setNewTable({ type: 'regular', number: '', capacity: String(DEFAULT_CAPACITY.regular ?? '') });
  toast.success('Table added');
};
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` and `npm run lint`. Expected: clean.

- [ ] **Step 7: Manual verification**

In the running app, open "Add Table": confirm Regular defaults to capacity 10, switching to VIP updates the field to 6, switching to Bridal clears it (uncapped placeholder). Hand-edit the capacity to something else, then switch type again — confirm your hand-edited value is preserved (not overwritten). Create a table with a custom capacity and one left uncapped; confirm both save without error.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/AdminTables.tsx
git commit -m "feat: add capacity field to Add Table dialog with type-based defaults"
```

---

## Task 4: Table card capacity UI (progress bar, inline edit, overbooked warning)

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`

**Interfaces:**
- Consumes: `getEffectiveCapacity`, `getCapacityStatus` from `@/components/admin/tables/capacity` (Task 2).
- Produces: `handleUpdateCapacity(tableId: string, capacity: number | undefined): void` on the page, passed into `DroppableTable` as `onUpdateCapacity`.

- [ ] **Step 1: Import capacity helpers and an icon**

Add to imports:
```ts
import { getEffectiveCapacity, getCapacityStatus } from '@/components/admin/tables/capacity';
```
Add `AlertTriangle` to the existing `lucide-react` import list in this file.

- [ ] **Step 2: Add `handleUpdateCapacity` to `AdminTables`**

Add near `handleRemoveTable`:
```ts
const handleUpdateCapacity = useCallback((tableId: string, capacity: number | undefined) => {
  setActiveTables(prev => {
    const updated = prev.map(t => t.id === tableId ? { ...t, capacity } : t);
    persistTableLayout(updated);
    return updated;
  });
}, []);
```

- [ ] **Step 3: Pass it down to `DroppableTable`**

In the JSX that renders `<DroppableTable ... />` inside the grid, add the prop:
```tsx
onUpdateCapacity={handleUpdateCapacity}
```

- [ ] **Step 4: Update `DroppableTable`'s props type**

Add to its props interface:
```ts
onUpdateCapacity: (tableId: string, capacity: number | undefined) => void;
```

- [ ] **Step 5: Add capacity state and handlers inside `DroppableTable`**

Right after the existing `const [isAssignOpen, setIsAssignOpen] = useState(false);` / `const [assignSearch, setAssignSearch] = useState('');` lines, add:
```ts
const [isEditingCapacity, setIsEditingCapacity] = useState(false);
const [capacityDraft, setCapacityDraft] = useState('');

const capacity = getEffectiveCapacity(table);
const status = getCapacityStatus(countOccupants, capacity);

const startEditCapacity = () => {
  setCapacityDraft(capacity !== undefined ? String(capacity) : '');
  setIsEditingCapacity(true);
};

const commitCapacity = () => {
  setIsEditingCapacity(false);
  const trimmed = capacityDraft.trim();
  if (trimmed === '') {
    onUpdateCapacity(table.id, undefined);
    return;
  }
  const parsed = parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    toast.error('Capacity must be a positive number');
    return;
  }
  onUpdateCapacity(table.id, parsed);
};
```
Note: `countOccupants` is already computed further down in the existing code (`const countOccupants = tableGuests.filter(g => !g.is_baby_or_child).length;`) — move that line up above this new block so `status` can reference it (order matters since it's used in the JSX below too; keeping a single `countOccupants` declaration, just relocated earlier in the function body).

`DroppableTable` needs `toast` imported — it isn't in this file's top-level `sonner` import yet at the component level since `toast` is already imported once at the top of `AdminTables.tsx` and is available to all code in the file (no per-component import needed while everything lives in one file).

- [ ] **Step 6: Replace the plain guest-count line in the `CardHeader` with the capacity UI**

Replace:
```tsx
<p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
  {countOccupants} {countOccupants === 1 ? 'Guest' : 'Guests'}
</p>
```
with:
```tsx
<div className="mt-0.5">
  {isEditingCapacity ? (
    <Input
      autoFocus
      type="number"
      min={1}
      value={capacityDraft}
      onChange={e => setCapacityDraft(e.target.value)}
      onFocus={e => e.target.select()}
      onBlur={commitCapacity}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commitCapacity(); }
        if (e.key === 'Escape') { e.preventDefault(); setIsEditingCapacity(false); }
      }}
      placeholder="Uncapped"
      className="h-6 w-24 px-2 text-xs"
    />
  ) : (
    <button
      type="button"
      onClick={startEditCapacity}
      title="Click to edit capacity"
      className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-wedding-gold transition-colors inline-flex items-center gap-1"
    >
      {capacity !== undefined
        ? `${countOccupants} / ${capacity} Guest${capacity === 1 ? '' : 's'}`
        : `${countOccupants} Guest${countOccupants === 1 ? '' : 's'} · Uncapped`}
      {status === 'over' && (
        <span title={`${countOccupants - (capacity ?? 0)} over capacity`}>
          <AlertTriangle className="w-3 h-3 text-rose-500" />
        </span>
      )}
    </button>
  )}
  {capacity !== undefined && (
    <div className="mt-1 h-1 w-24 rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          status === 'over' ? 'bg-rose-500' : status === 'full' ? 'bg-amber-400' : 'bg-wedding-gold'
        }`}
        style={{ width: `${Math.min((countOccupants / capacity) * 100, 100)}%` }}
      />
    </div>
  )}
</div>
```

- [ ] **Step 7: Add the overbooked ring to the `Card`**

Replace:
```tsx
<Card className={`
  h-full border-slate-200/60 shadow-sm transition-all rounded-3xl overflow-hidden group
  ${isOver ? 'ring-2 ring-wedding-gold scale-[1.02] bg-wedding-gold/5' : ''}
`}>
```
with:
```tsx
<Card className={`
  h-full border-slate-200/60 shadow-sm transition-all rounded-3xl overflow-hidden group
  ${isOver ? 'ring-2 ring-wedding-gold scale-[1.02] bg-wedding-gold/5' : status === 'over' ? 'ring-2 ring-rose-300' : ''}
`}>
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit` and `npm run lint`. Expected: clean.

- [ ] **Step 9: Manual verification**

In the app: confirm each table header shows `"{n} / {capacity} Guests"` (or `"{n} Guests · Uncapped"` for bridal by default). Click the capacity text, change the number, press Enter — confirm it updates and the progress bar reflects it (gold under capacity, amber at capacity, rose + warning icon + rose card ring when over). Press Escape while editing — confirm it cancels without saving. Clear the field and blur — confirm it becomes uncapped. Refresh the page — confirm the edited capacity persisted. Drag a guest into an already-full/over table — confirm the move still succeeds (capacity never blocks it).

- [ ] **Step 10: Commit**

```bash
git add src/pages/admin/AdminTables.tsx
git commit -m "feat: add editable capacity, progress bar, and overbooked warning to table cards"
```

---

## Task 5: Global filter bar (search, table type, role, capacity status)

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`

**Interfaces:**
- Produces (new page state/derived values): `search`, `typeFilter`, `roleFilter`, `capacityFilter`, `availableRoles`, `hasGuestFilter`, `matchesGuestFilters(guest: Guest): boolean`, `visibleTables: Table[]`, replaces the old `guestSearch`/`filteredUnassigned` pairing.

- [ ] **Step 1: Replace the old search state with the full filter state**

Replace:
```ts
// Search state for unassigned guests
const [guestSearch, setGuestSearch] = useState('');
```
with:
```ts
// Filters (drive both the table grid and the guest lists inside it)
const [search, setSearch] = useState('');
const [typeFilter, setTypeFilter] = useState<'all' | Table['type']>('all');
const [roleFilter, setRoleFilter] = useState<string>('all'); // 'all' | 'guest' (no role) | an actual role string
const [capacityFilter, setCapacityFilter] = useState<'all' | 'room' | 'full' | 'over'>('all');
```

- [ ] **Step 2: Add the shared guest matcher, available-roles list, and `hasGuestFilter`**

Add after the `unassignedGuests` memo:
```ts
const availableRoles = useMemo(() => {
  const roles = new Set<string>();
  guests.forEach(g => { if (g.role) roles.add(g.role); });
  return Array.from(roles).sort();
}, [guests]);

const matchesGuestFilters = useCallback((g: Guest) => {
  const q = search.toLowerCase();
  const searchMatch = !search ||
    g.name.toLowerCase().includes(q) ||
    (g.nickname ? g.nickname.toLowerCase().includes(q) : false) ||
    (g.role ? g.role.toLowerCase().includes(q) : false);
  const roleMatch = roleFilter === 'all' || (roleFilter === 'guest' ? !g.role : g.role === roleFilter);
  return searchMatch && roleMatch;
}, [search, roleFilter]);

const hasGuestFilter = search.trim() !== '' || roleFilter !== 'all';
```

- [ ] **Step 3: Replace `filteredUnassigned` to use the shared matcher**

Replace:
```ts
const filteredUnassigned = useMemo(() =>
  unassignedGuests.filter(g =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
    (g.nickname && g.nickname.toLowerCase().includes(guestSearch.toLowerCase())) ||
    (g.role && g.role.toLowerCase().includes(guestSearch.toLowerCase()))
  )
, [unassignedGuests, guestSearch]);
```
with:
```ts
const filteredUnassigned = useMemo(() =>
  unassignedGuests.filter(matchesGuestFilters)
, [unassignedGuests, matchesGuestFilters]);
```

- [ ] **Step 4: Add `visibleTables`, filtered per-table guest lists, and derived table-level capacity status**

Add after `guestsByTable`:
```ts
const visibleTables = useMemo(() =>
  activeTables.filter(table => {
    if (typeFilter !== 'all' && table.type !== typeFilter) return false;

    const tableGuests = guestsByTable[table.id] ?? EMPTY_GUESTS;
    const occupants = tableGuests.filter(g => !g.is_baby_or_child).length;
    const status = getCapacityStatus(occupants, getEffectiveCapacity(table));
    if (capacityFilter !== 'all' && status !== capacityFilter) return false;

    // A table with guests but none matching the active search/role filter
    // hides; an empty table always stays visible (still a valid, useful
    // drop target while searching) as long as type/capacity match.
    if (hasGuestFilter && tableGuests.length > 0 && !tableGuests.some(matchesGuestFilters)) return false;

    return true;
  })
, [activeTables, guestsByTable, typeFilter, capacityFilter, hasGuestFilter, matchesGuestFilters]);
```

- [ ] **Step 5: Add the filter bar UI**

Insert this new `<div>` right after the page header block (after the `</div>` that closes the `flex flex-col lg:flex-row ...` header row, before the `<div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">` grid):
```tsx
<div className="flex flex-wrap gap-4 items-end">
  <div className="flex-1 min-w-[240px]">
    <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Search</Label>
    <div className="relative mt-1.5">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <Input
        className="pl-11 h-11 bg-white border-none shadow-sm rounded-xl"
        placeholder="Search by name, nickname, or role..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
    </div>
  </div>

  <div className="flex flex-col gap-1.5 min-w-[150px]">
    <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Table Type</Label>
    <select
      className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm"
      value={typeFilter}
      onChange={e => setTypeFilter(e.target.value as 'all' | Table['type'])}
    >
      <option value="all">All Types</option>
      {TABLE_TYPES.map(t => (
        <option key={t.id} value={t.id}>{t.label}</option>
      ))}
    </select>
  </div>

  <div className="flex flex-col gap-1.5 min-w-[150px]">
    <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Role</Label>
    <select
      className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm"
      value={roleFilter}
      onChange={e => setRoleFilter(e.target.value)}
    >
      <option value="all">All Roles</option>
      <option value="guest">Guest</option>
      {availableRoles.map(role => (
        <option key={role} value={role}>{role}</option>
      ))}
    </select>
  </div>

  <div className="flex flex-col gap-1.5 min-w-[150px]">
    <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Capacity</Label>
    <select
      className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm"
      value={capacityFilter}
      onChange={e => setCapacityFilter(e.target.value as 'all' | 'room' | 'full' | 'over')}
    >
      <option value="all">All Tables</option>
      <option value="room">Has Room</option>
      <option value="full">Full</option>
      <option value="over">Overbooked</option>
    </select>
  </div>

  {(search || typeFilter !== 'all' || roleFilter !== 'all' || capacityFilter !== 'all') && (
    <Button
      variant="ghost"
      onClick={() => {
        setSearch('');
        setTypeFilter('all');
        setRoleFilter('all');
        setCapacityFilter('all');
      }}
      className="h-11 px-4 rounded-xl text-slate-500"
    >
      Clear Filters
    </Button>
  )}
</div>
```

- [ ] **Step 6: Wire the grid to render `visibleTables` and pass per-table filtered guest data**

Replace:
```tsx
{activeTables.map((table) => (
  <DroppableTable
    key={table.id}
    table={table}
    tableGuests={guestsByTable[table.id] ?? EMPTY_GUESTS}
    onRemoveTable={handleRemoveTable}
    onQuickMove={handleQuickMove}
    availableTables={activeTables}
    unassignedGuests={unassignedGuests}
    onUpdateCapacity={handleUpdateCapacity}
  />
))}

{activeTables.length === 0 && (
  <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
    <TableIcon className="w-12 h-12 mb-4 opacity-20" />
    <p className="font-serif text-xl mb-1 text-slate-600">No tables created yet</p>
    <p className="text-sm">Click "Add Table" to start organizing</p>
  </div>
)}
```
with:
```tsx
{visibleTables.map((table) => {
  const allTableGuests = guestsByTable[table.id] ?? EMPTY_GUESTS;
  const visibleGuests = hasGuestFilter ? allTableGuests.filter(matchesGuestFilters) : allTableGuests;
  return (
    <DroppableTable
      key={table.id}
      table={table}
      allTableGuests={allTableGuests}
      visibleGuests={visibleGuests}
      hasGuestFilter={hasGuestFilter}
      onRemoveTable={handleRemoveTable}
      onQuickMove={handleQuickMove}
      availableTables={activeTables}
      unassignedGuests={unassignedGuests}
      onUpdateCapacity={handleUpdateCapacity}
    />
  );
})}

{activeTables.length === 0 && (
  <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
    <TableIcon className="w-12 h-12 mb-4 opacity-20" />
    <p className="font-serif text-xl mb-1 text-slate-600">No tables created yet</p>
    <p className="text-sm">Click "Add Table" to start organizing</p>
  </div>
)}

{activeTables.length > 0 && visibleTables.length === 0 && (
  <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
    <Search className="w-12 h-12 mb-4 opacity-20" />
    <p className="font-serif text-xl mb-1 text-slate-600">No tables match your filters</p>
    <Button
      variant="ghost"
      className="mt-2 text-wedding-gold"
      onClick={() => { setSearch(''); setTypeFilter('all'); setRoleFilter('all'); setCapacityFilter('all'); }}
    >
      Clear Filters
    </Button>
  </div>
)}
```

- [ ] **Step 7: Update `DroppableTable`'s props to match (`tableGuests` → `allTableGuests`/`visibleGuests`/`hasGuestFilter`)**

Change its props interface from:
```ts
table: Table;
tableGuests: Guest[];
onRemoveTable: (id: string) => void;
onQuickMove: (guestId: string, tableId: string | null) => void;
availableTables: Table[];
unassignedGuests: Guest[];
onUpdateCapacity: (tableId: string, capacity: number | undefined) => void;
```
to:
```ts
table: Table;
allTableGuests: Guest[];
visibleGuests: Guest[];
hasGuestFilter: boolean;
onRemoveTable: (id: string) => void;
onQuickMove: (guestId: string, tableId: string | null) => void;
availableTables: Table[];
unassignedGuests: Guest[];
onUpdateCapacity: (tableId: string, capacity: number | undefined) => void;
```
and destructure the new prop names in the component signature accordingly.

Inside `DroppableTable`, replace every remaining reference to `tableGuests` with `allTableGuests`, **except** the `<SortableContext items={...}>` and the `.map((guest) => ...)` that render the guest list — those should use `visibleGuests` (so filtered-out guests don't render), and the `SortableContext`'s `items` array should be `visibleGuests.map(g => g.id)`. `countOccupants` (used for the capacity math from Task 4) must stay based on `allTableGuests` — capacity/progress always reflects the true roster, not the filtered view:
```ts
const countOccupants = allTableGuests.filter(g => !g.is_baby_or_child).length;
```

- [ ] **Step 8: Add the "X of Y shown" indicator when a guest filter is narrowing this table**

Immediately above the capacity `<div className="mt-0.5">...` block added in Task 4, add:
```tsx
{hasGuestFilter && countOccupants > 0 && (
  <p className="text-[9px] text-wedding-gold/80 font-bold uppercase tracking-widest">
    {visibleGuests.filter(g => !g.is_baby_or_child).length} of {countOccupants} shown
  </p>
)}
```

- [ ] **Step 9: Update the empty-table placeholder condition to use `visibleGuests`**

Replace:
```tsx
{tableGuests.length === 0 && (
  <div className="flex flex-col items-center justify-center py-8 text-slate-300 border-2 border-dashed border-slate-50 rounded-2xl">
    <Users className="w-8 h-8 mb-2 opacity-20" />
    <span className="text-[10px] font-bold uppercase tracking-widest">Empty Table</span>
  </div>
)}
```
with:
```tsx
{visibleGuests.length === 0 && (
  <div className="flex flex-col items-center justify-center py-8 text-slate-300 border-2 border-dashed border-slate-50 rounded-2xl">
    <Users className="w-8 h-8 mb-2 opacity-20" />
    <span className="text-[10px] font-bold uppercase tracking-widest">Empty Table</span>
  </div>
)}
```
(This is still correct even under a filter: per Step 4/§ of the filtering logic, a table only stays visible under a guest filter if it has zero guests at all, or at least one guest matches — so `visibleGuests.length === 0` here only happens for genuinely empty tables.)

- [ ] **Step 10: Also delete the trash-button visibility check's use of `tableGuests`**

Replace:
```tsx
{tableGuests.length === 0 && table.type !== 'bridal' && (
```
with:
```tsx
{allTableGuests.length === 0 && table.type !== 'bridal' && (
```
(Deleting a table should only be offered when it's truly empty, not merely filtered to look empty.)

- [ ] **Step 11: Remove the sidebar's own search box, wire it to the shared filter state**

In `UnassignedContainer`'s props interface, remove `search: string;` and `onSearchChange: (val: string) => void;`. Remove this block from its JSX entirely:
```tsx
<div className="relative mb-4">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
  <Input 
    className="pl-9 h-10 bg-white border-none shadow-sm rounded-xl text-xs" 
    placeholder="Search name..."
    value={search}
    onChange={e => onSearchChange(e.target.value)}
  />
</div>
```
Add a `hasFilter: boolean` prop instead (for the empty-state message in Step 12), and update both call sites (desktop sidebar and mobile sheet in `AdminTables`'s render) to drop the `search={guestSearch}` / `onSearchChange={setGuestSearch}` props and instead pass `hasFilter={hasGuestFilter}`.

- [ ] **Step 12: Differentiate the sidebar's empty state**

Replace:
```tsx
{guests.length === 0 && (
  <div className="text-center py-12 text-slate-300">
    <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-10" />
    <p className="text-xs uppercase tracking-widest font-bold">Done!</p>
  </div>
)}
```
with:
```tsx
{guests.length === 0 && (
  <div className="text-center py-12 text-slate-300">
    {hasFilter ? (
      <>
        <Search className="w-12 h-12 mx-auto mb-2 opacity-10" />
        <p className="text-xs uppercase tracking-widest font-bold">No matches</p>
      </>
    ) : (
      <>
        <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-10" />
        <p className="text-xs uppercase tracking-widest font-bold">Done!</p>
      </>
    )}
  </div>
)}
```

- [ ] **Step 13: Verify**

Run: `npx tsc --noEmit` and `npm run lint`. Expected: clean (watch for the now-unused `guestSearch` name and any stale `search`/`onSearchChange` prop references).

- [ ] **Step 14: Manual verification**

In the app: type a guest's name in the new top search box — confirm the sidebar narrows AND any table cards containing that guest narrow to just that guest, with a "1 of N shown" label, while tables with no match disappear and empty tables stay visible. Try the Table Type filter (e.g. "VIP") — confirm only VIP tables show. Try the Role filter. Try the Capacity filter ("Overbooked") after manually pushing a table over capacity (Task 4) — confirm only that table shows. Combine multiple filters. Click "Clear Filters" — confirm everything resets. Confirm the quick-move dropdown on a guest still lists every table regardless of active filters.

- [ ] **Step 15: Commit**

```bash
git add src/pages/admin/AdminTables.tsx
git commit -m "feat: add global filter bar for search, table type, role, and capacity status"
```

---

## Task 6: Bulk assign unassigned guests to a table

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`

**Interfaces:**
- Consumes: `commitInChunks` (already imported), `Checkbox` from `@/components/ui/checkbox`.
- Produces: `selectedIds: string[]` state, `handleToggleSelect(guestId: string): void`, `handleBulkAssign(guestIds: string[], tableId: string): Promise<void>`, `handleClearSelection(): void`.

- [ ] **Step 1: Import `Checkbox`**

Add:
```ts
import { Checkbox } from '@/components/ui/checkbox';
```

- [ ] **Step 2: Add selection state and handlers to `AdminTables`**

Add near the other `useState` declarations:
```ts
const [selectedIds, setSelectedIds] = useState<string[]>([]);
```

Add near `handleQuickMove`:
```ts
const handleToggleSelect = useCallback((guestId: string) => {
  setSelectedIds(prev => prev.includes(guestId) ? prev.filter(id => id !== guestId) : [...prev, guestId]);
}, []);

const handleClearSelection = useCallback(() => setSelectedIds([]), []);

const handleBulkAssign = useCallback(async (guestIds: string[], tableId: string) => {
  const table = activeTables.find(t => t.id === tableId);
  if (!table || guestIds.length === 0) return;

  try {
    const targetGuests = guests.filter(g =>
      g.table_type === table.type && (g.table_number || '') === (table.number || '')
    );
    let nextOrder = targetGuests.length > 0
      ? Math.max(...targetGuests.map(g => g.table_order || 0)) + 1
      : 0;

    const ops = guestIds.map(id => ({ id, order: nextOrder++ }));
    await commitInChunks(ops, ({ id, order }, batch) => {
      batch.update(doc(db, 'guests', id), {
        table_type: table.type,
        table_number: table.number,
        table_order: order,
        updated_at: serverTimestamp()
      });
    });
    toast.success(`${guestIds.length} guest${guestIds.length === 1 ? '' : 's'} assigned`);
    setSelectedIds([]);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'guests');
  }
}, [activeTables, guests]);
```

- [ ] **Step 3: Auto-clear selections that fall out of the visible unassigned list**

Add a new `useEffect` near the other effects:
```ts
useEffect(() => {
  setSelectedIds(prev => prev.filter(id => filteredUnassigned.some(g => g.id === id)));
}, [filteredUnassigned]);
```

- [ ] **Step 4: Pass selection props down to both `UnassignedContainer` usages (desktop and mobile)**

Add these props to both `<UnassignedContainer ... />` call sites:
```tsx
selectedIds={selectedIds}
onToggleSelect={handleToggleSelect}
onClearSelection={handleClearSelection}
onBulkAssign={handleBulkAssign}
```

- [ ] **Step 5: Update `UnassignedContainer`'s props interface**

Add:
```ts
selectedIds: string[];
onToggleSelect: (guestId: string) => void;
onClearSelection: () => void;
onBulkAssign: (guestIds: string[], tableId: string) => void;
```

- [ ] **Step 6: Pass selection props through to each `SortableGuestItem` it renders**

Replace:
```tsx
{guests.map((guest) => (
  <SortableGuestItem 
    key={guest.id} 
    guest={guest} 
    onQuickMove={onQuickMove}
    availableTables={availableTables}
  />
))}
```
with:
```tsx
{guests.map((guest) => (
  <SortableGuestItem 
    key={guest.id} 
    guest={guest} 
    onQuickMove={onQuickMove}
    availableTables={availableTables}
    selectable
    selected={selectedIds.includes(guest.id)}
    onToggleSelect={onToggleSelect}
  />
))}
```

- [ ] **Step 7: Give `SortableGuestItem` checkbox support**

Add to its props interface:
```ts
selectable?: boolean;
selected?: boolean;
onToggleSelect?: (guestId: string) => void;
```
Destructure with defaults: `selectable = false, selected = false, onToggleSelect`.

In its render, right before the existing `<div className="flex items-center gap-2 flex-1 min-w-0" {...attributes} {...listeners}>` line (inside the outer `flex items-center justify-between gap-2` row), add:
```tsx
{selectable && !isOverlay && onToggleSelect && (
  <Checkbox
    checked={selected}
    onCheckedChange={() => onToggleSelect(guest.id)}
    className="flex-shrink-0"
  />
)}
```
(It's a sibling of the drag-handle div, not inside it, so clicking the checkbox never starts a drag — `attributes`/`listeners` are only spread onto that specific div.)

- [ ] **Step 8: Give `AdminTables` a per-table occupancy lookup**

`UnassignedContainer`'s bulk-assign menu needs to show each table's current occupancy (e.g. "4/6"), which it doesn't have access to today. Add, after `guestsByTable`:
```ts
const tableOccupants = useMemo(() => {
  const m: Record<string, number> = {};
  for (const table of activeTables) {
    m[table.id] = (guestsByTable[table.id] ?? EMPTY_GUESTS).filter(g => !g.is_baby_or_child).length;
  }
  return m;
}, [activeTables, guestsByTable]);
```
Pass `tableOccupants={tableOccupants}` to both `<UnassignedContainer />` call sites (desktop and mobile).

- [ ] **Step 9: Add the floating bulk-action bar to `UnassignedContainer`**

Add `tableOccupants: Record<string, number>;` to `UnassignedContainer`'s props interface, and import `getEffectiveCapacity` from `@/components/admin/tables/capacity` (this file doesn't have that import yet).

Replace:
```tsx
<div className="flex items-center justify-between mb-4">
  <h3 className="font-serif text-xl text-slate-800">Unassigned</h3>
  <span className="text-[10px] px-2 py-1 bg-white text-slate-400 rounded-full border border-slate-100 font-bold">
    {guests.length}
  </span>
</div>
```
with:
```tsx
{selectedIds.length > 0 ? (
  <div className="flex items-center justify-between mb-4 gap-2">
    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{selectedIds.length} selected</span>
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger 
          render={
            <Button size="sm" className="h-8 rounded-lg bg-wedding-gold hover:bg-wedding-gold/80 text-xs">
              Assign to table
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-bold">
            Assign {selectedIds.length} guest{selectedIds.length === 1 ? '' : 's'} to...
          </DropdownMenuLabel>
          {availableTables.map(table => {
            const capacity = getEffectiveCapacity(table);
            const occupants = tableOccupants[table.id] ?? 0;
            const label = table.type === 'bridal' ? 'Bridal Table' : table.type === 'vip' ? `VIP ${table.number}` : `Regular ${table.number}`;
            const occupancyLabel = capacity !== undefined ? `${occupants}/${capacity}` : `${occupants}`;
            return (
              <DropdownMenuItem 
                key={table.id}
                className="flex justify-between items-center text-xs"
                onClick={() => onBulkAssign(selectedIds, table.id)}
              >
                <span>{label}</span>
                <span className="text-slate-400">{occupancyLabel}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={onClearSelection}>
        Clear
      </Button>
    </div>
  </div>
) : (
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-serif text-xl text-slate-800">Unassigned</h3>
    <span className="text-[10px] px-2 py-1 bg-white text-slate-400 rounded-full border border-slate-100 font-bold">
      {guests.length}
    </span>
  </div>
)}
```
`selectedIds`, `availableTables`, and `onClearSelection` are already props on `UnassignedContainer`; `onBulkAssign` was added in Step 5.

- [ ] **Step 10: Verify**

Run: `npx tsc --noEmit` and `npm run lint`. Expected: clean.

- [ ] **Step 11: Manual verification**

In the app: check 2-3 unassigned guests' checkboxes — confirm the sidebar header swaps to the "N selected / Assign to table / Clear" bar. Open "Assign to table", confirm every active table is listed with its current occupancy (e.g. "4/6"), pick one — confirm all selected guests move to that table, a single success toast appears, and selection clears. Confirm assigning into an already-full table still works (soft limit) and shows the overbooked warning from Task 4 afterward. Confirm typing in the search box or changing a filter that removes a selected guest from view clears that guest from the selection automatically. Repeat on the mobile sheet (resize browser or use device toolbar).

- [ ] **Step 12: Commit**

```bash
git add src/pages/admin/AdminTables.tsx
git commit -m "feat: add bulk multi-select assign for unassigned guests"
```

---

## Task 7: Print / export seating chart

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`

- [ ] **Step 1: Add a `Printer` icon import and a print handler**

Add `Printer` to the `lucide-react` import list.

Add near the top of the component body (or inline where used):
```ts
const handlePrint = () => window.print();
```

- [ ] **Step 2: Add the Print button next to Add Table**

In the header actions row, right before the `<Dialog open={isAddTableOpen} ...>` for Add Table, add:
```tsx
<Button onClick={handlePrint} variant="outline" className="border-slate-200 rounded-2xl h-12 print:hidden">
  <Printer className="w-4 h-4 mr-2" />
  Print Seating Chart
</Button>
```

- [ ] **Step 3: Hide interactive/navigational chrome when printing**

Add `print:hidden` to the className of each of the following (append to their existing className strings, don't replace):
- The filter bar's outer `<div className="flex flex-wrap gap-4 items-end">` from Task 5.
- The Add Table `<Dialog>`'s trigger button (the `<Button className="bg-wedding-gold hover:bg-wedding-gold/80 rounded-2xl h-12">` inside `DialogTrigger`'s `render`).
- The desktop sidebar wrapper: `<div className="hidden lg:block lg:col-span-1 sticky top-6">`.
- The mobile FAB wrapper: `<div className="lg:hidden fixed bottom-6 right-6 z-40">`.
- Inside `DroppableTable`'s `CardHeader`, the `<div className="flex items-center gap-1">` that wraps the Quick Assign dialog trigger and delete button.
- Inside `DroppableTable`, the capacity edit control's clickable `<button>`/`<Input>` and its progress-bar `<div>` (both from Task 4) — wrap them together in an outer `<div className="print:hidden">` rather than tagging each individually.
- Inside `DroppableTable`'s `CardContent`, the existing `<div className="space-y-1">` that contains the `SortableContext`/guest list.

- [ ] **Step 4: Make the main content span full width and paginate cleanly in print**

Change the main content wrapper:
```tsx
<div className="lg:col-span-3">
```
to:
```tsx
<div className="lg:col-span-3 print:col-span-4">
```
Change the table grid:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
```
to:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
```

- [ ] **Step 5: Add a plain-text guest list and capacity summary for print, inside `DroppableTable`**

Right after the `CardContent`'s guest-list `<div className="space-y-1">...</div>` (now `print:hidden` per Step 3), add a sibling element that only shows when printing:
```tsx
<div className="hidden print:block space-y-0.5">
  {allTableGuests.map(g => (
    <div key={g.id} className="text-xs text-slate-700">
      {g.name}{g.is_baby_or_child ? ' (Baby/Child)' : ''}
    </div>
  ))}
  {allTableGuests.length === 0 && (
    <div className="text-xs text-slate-400 italic">No guests assigned</div>
  )}
</div>
```
Also add a print-only capacity summary line right after the capacity edit control's now-`print:hidden` wrapper (from Step 3), as a sibling:
```tsx
<p className="hidden print:block text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
  {capacity !== undefined ? `${countOccupants} / ${capacity} Guests` : `${countOccupants} Guests`}
</p>
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` and `npm run lint`. Expected: clean.

- [ ] **Step 7: Manual verification**

In the app, click "Print Seating Chart" (or use the browser's print preview, e.g. Ctrl/Cmd+P, to inspect without actually printing). Confirm: the filter bar, sidebar, mobile FAB, Add Table/Print buttons, and all per-card interactive controls (assign/delete buttons, drag handles, capacity edit control) are gone; each table shows its name, a plain occupancy line, and a plain list of guest names; the layout uses the full page width and reads cleanly across two columns.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/AdminTables.tsx
git commit -m "feat: add print-friendly seating chart export"
```

---

## Task 8: Extract `SortableGuestItem` into its own file

**Files:**
- Create: `src/components/admin/tables/SortableGuestItem.tsx`
- Modify: `src/pages/admin/AdminTables.tsx`

This is a pure move — no behavior change. `SortableGuestItem` at this point already has its final shape (guest display, quick-move dropdown, bulk-select checkbox) from Tasks 1–6.

- [ ] **Step 1: Create `src/components/admin/tables/SortableGuestItem.tsx`**

Move the entire `SortableGuestItem` component (as it exists after Task 6) into this new file, with its own imports:
```tsx
import React from 'react';
import {
  GripVertical,
  Plus,
  UserCheck,
  UserX
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import type { Guest } from '@/features/guests/types';
import type { Table } from './types';

interface SortableGuestItemProps {
  guest: Guest;
  isOverlay?: boolean;
  onQuickMove?: (guestId: string, tableId: string | null) => void;
  availableTables?: Table[];
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (guestId: string) => void;
}

export const SortableGuestItem = React.memo<SortableGuestItemProps>(({
  guest,
  isOverlay = false,
  onQuickMove,
  availableTables = [],
  selectable = false,
  selected = false,
  onToggleSelect
}) => {
  // ...paste the exact body from AdminTables.tsx's current SortableGuestItem unchanged...
});

SortableGuestItem.displayName = 'SortableGuestItem';
```
Paste the component body exactly as it currently exists in `AdminTables.tsx` (unchanged logic/JSX) between the destructured props and the closing `});`.

- [ ] **Step 2: In `AdminTables.tsx`, delete the inline `SortableGuestItem` definition and import it instead**

Remove the whole `const SortableGuestItem = React.memo<{...}>(...)` block.
Add:
```ts
import { SortableGuestItem } from '@/components/admin/tables/SortableGuestItem';
```
Remove any `lucide-react` icon imports in `AdminTables.tsx` that were only used by `SortableGuestItem` and are no longer referenced elsewhere in the file (check `GripVertical`, `Plus`, `UserCheck`, `UserX` against remaining usages — some, like `UserX`, may still be used elsewhere, e.g. the Unassigned empty-state icon; keep any still in use). Also remove `Checkbox` and the `DropdownMenu*` imports from `AdminTables.tsx` if `DroppableTable`'s own Quick Assign dialog doesn't need them directly (check remaining usages first — `DropdownMenu` is also used by the bulk-assign action bar added in Task 6, which still lives in `AdminTables.tsx`/`UnassignedContainer` at this point, so don't remove those).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` and `npm run lint`. Expected: clean.

- [ ] **Step 4: Manual verification**

Confirm the page behaves identically to before this task: guest items render, drag-and-drop works, quick-move dropdown works, bulk-select checkboxes work.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tables/SortableGuestItem.tsx src/pages/admin/AdminTables.tsx
git commit -m "refactor: extract SortableGuestItem into its own file"
```

---

## Task 9: Extract `DroppableTable` into its own file

**Files:**
- Create: `src/components/admin/tables/DroppableTable.tsx`
- Modify: `src/pages/admin/AdminTables.tsx`

Pure move, same approach as Task 8. `DroppableTable` at this point has its final shape (capacity UI, filtering-aware guest list, print markup) from Tasks 4, 5, and 7.

- [ ] **Step 1: Create `src/components/admin/tables/DroppableTable.tsx`**

```tsx
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users,
  User,
  Crown,
  Star,
  GlassWater,
  Plus,
  Trash2,
  Search,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableGuestItem } from './SortableGuestItem';
import { getEffectiveCapacity, getCapacityStatus } from './capacity';
import type { Guest } from '@/features/guests/types';
import type { Table } from './types';

interface DroppableTableProps {
  table: Table;
  allTableGuests: Guest[];
  visibleGuests: Guest[];
  hasGuestFilter: boolean;
  onRemoveTable: (id: string) => void;
  onQuickMove: (guestId: string, tableId: string | null) => void;
  onUpdateCapacity: (tableId: string, capacity: number | undefined) => void;
  availableTables: Table[];
  unassignedGuests: Guest[];
}

export const DroppableTable = React.memo<DroppableTableProps>(({
  table,
  allTableGuests,
  visibleGuests,
  hasGuestFilter,
  onRemoveTable,
  onQuickMove,
  onUpdateCapacity,
  availableTables,
  unassignedGuests
}) => {
  // ...paste the exact body from AdminTables.tsx's current DroppableTable unchanged...
});

DroppableTable.displayName = 'DroppableTable';
```
Paste the component body exactly as it currently exists in `AdminTables.tsx` (unchanged logic/JSX, including the `useSortable`, `isAssignOpen`/`assignSearch` state, capacity edit state/handlers, `getTableIcon`/`getTableTitle` helpers, and the full JSX with print classes) between the destructured props and the closing `});`.

- [ ] **Step 2: In `AdminTables.tsx`, delete the inline `DroppableTable` definition and import it instead**

Remove the whole `const DroppableTable = React.memo<{...}>(...)` block.
Add:
```ts
import { DroppableTable } from '@/components/admin/tables/DroppableTable';
```
Remove now-unused imports from `AdminTables.tsx` (check each of `Crown`, `Star`, `GlassWater`, `AlertTriangle`, and the `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogTrigger` set against remaining usage — the page's own "Add Table" dialog still uses `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogTrigger`, so only remove what's truly unused).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` and `npm run lint`. Expected: clean.

- [ ] **Step 4: Manual verification**

Confirm table cards render identically: capacity UI, progress bars, overbooked warnings, quick-assign dialog, delete button, print preview all still work exactly as after Task 7.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tables/DroppableTable.tsx src/pages/admin/AdminTables.tsx
git commit -m "refactor: extract DroppableTable into its own file"
```

---

## Task 10: Extract `UnassignedContainer` into its own file

**Files:**
- Create: `src/components/admin/tables/UnassignedContainer.tsx`
- Modify: `src/pages/admin/AdminTables.tsx`

Pure move, same approach as Tasks 8–9. `UnassignedContainer` at this point has its final shape (bulk-select action bar, filtered list, differentiated empty state) from Tasks 5 and 6.

- [ ] **Step 1: Create `src/components/admin/tables/UnassignedContainer.tsx`**

```tsx
import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Search, UserCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { SortableGuestItem } from './SortableGuestItem';
import { getEffectiveCapacity } from './capacity';
import type { Guest } from '@/features/guests/types';
import type { Table } from './types';

interface UnassignedContainerProps {
  guests: Guest[];
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  tableOccupants: Record<string, number>;
  hasFilter: boolean;
  isMobile?: boolean;
  selectedIds: string[];
  onToggleSelect: (guestId: string) => void;
  onClearSelection: () => void;
  onBulkAssign: (guestIds: string[], tableId: string) => void;
}

export const UnassignedContainer: React.FC<UnassignedContainerProps> = ({
  guests,
  onQuickMove,
  availableTables,
  tableOccupants,
  hasFilter,
  isMobile = false,
  selectedIds,
  onToggleSelect,
  onClearSelection,
  onBulkAssign
}) => {
  // ...paste the exact body from AdminTables.tsx's current UnassignedContainer unchanged...
};
```
Paste the component body exactly as it currently exists in `AdminTables.tsx` (unchanged logic/JSX, including the `useSortable` drop-target wiring and the selection action bar) between the destructured props and the closing `};`.

- [ ] **Step 2: In `AdminTables.tsx`, delete the inline `UnassignedContainer` definition and import it instead**

Remove the whole `const UnassignedContainer: React.FC<{...}> = (...) => {...}` block at the bottom of the file.
Add:
```ts
import { UnassignedContainer } from '@/components/admin/tables/UnassignedContainer';
```
Remove now-unused imports from `AdminTables.tsx` (re-check `Search`, `UserCheck`, `DropdownMenu*`, `Sheet`/`SheetContent`/`SheetTrigger` are still needed at the page level — `Sheet` primitives remain in `AdminTables.tsx` since the mobile trigger button/sheet wrapper stays there, only the inner content component moved).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` and `npm run lint`. Expected: clean.

- [ ] **Step 4: Manual verification**

Confirm the sidebar (desktop) and the mobile sheet both render identically: guest list, checkboxes, bulk-assign bar, empty states, drop-target highlight when dragging a guest over it.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tables/UnassignedContainer.tsx src/pages/admin/AdminTables.tsx
git commit -m "refactor: extract UnassignedContainer into its own file"
```

---

## Task 11: Interaction polish and full manual QA pass

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`
- Modify: `src/components/admin/tables/DroppableTable.tsx`

- [ ] **Step 1: Add a mount/filter-change transition to table cards**

In `AdminTables.tsx`, where `visibleTables.map(...)` renders each `<DroppableTable key={table.id} ... />`, wrap it in a `<div>` carrying the existing project's fade-in convention (already used at the page root: `animate-in fade-in slide-in-from-bottom-4 duration-1200`) — use a shorter duration appropriate for a per-card re-render:
```tsx
<div key={table.id} className="animate-in fade-in duration-300">
  <DroppableTable
    table={table}
    allTableGuests={allTableGuests}
    visibleGuests={visibleGuests}
    hasGuestFilter={hasGuestFilter}
    onRemoveTable={handleRemoveTable}
    onQuickMove={handleQuickMove}
    availableTables={activeTables}
    unassignedGuests={unassignedGuests}
    onUpdateCapacity={handleUpdateCapacity}
  />
</div>
```
(Move the `key` from `DroppableTable` to this wrapping `div`.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` and `npm run lint`. Expected: clean.

- [ ] **Step 3: Full manual QA pass**

Run `npm run dev`, log in, go to `/admin/tables`, and walk through the complete feature set end-to-end in one sitting:
1. Filters: search, table type, role, capacity status, individually and combined; Clear Filters resets all.
2. Capacity: edit a table's capacity inline, confirm the progress bar/ring/warning icon update correctly at under/at/over capacity, confirm it persists across refresh, confirm it never blocks a drag/quick-move/quick-assign/bulk-assign.
3. Bulk assign: select several unassigned guests, assign to a table, confirm order and toast; confirm filter changes clear stale selections.
4. Print: open print preview, confirm only the seating chart content shows.
5. Drag-and-drop (regression check): confirm the original drag-and-drop behavior between tables and the unassigned list still works exactly as before all these changes, including reordering within a table.
6. Mobile: shrink the viewport (or use responsive device mode), confirm the FAB, sheet, and bulk-assign bar all work there too.
7. Stat tiles and FAB badge: confirm they always show true totals even while filters are narrowing the visible tables/guests.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminTables.tsx src/components/admin/tables/DroppableTable.tsx
git commit -m "polish: add filter-change transitions to table cards"
```

---

## Self-Review Notes

- **Spec coverage:** §1 data model → Task 1. §2 filter bar → Task 5. §3 capacity UI → Task 4 (+ Task 3 for creation defaults). §4 bulk assign → Task 6. §5 print/export → Task 7. §6 polish/empty states → Tasks 5 (empty states) and 11 (transitions). File-structure extraction (implied by spec's implementation, made explicit here) → Tasks 8–10.
- **Type consistency:** `Table['capacity']` (Task 1) flows unchanged through `capacity.ts` (Task 2), the Add Table dialog (Task 3), `DroppableTable`'s capacity edit (Task 4), and the bulk-assign occupancy labels (Task 6). `DroppableTable`'s prop rename from `tableGuests` to `allTableGuests`/`visibleGuests`/`hasGuestFilter` happens once, in Task 5, and is carried through unchanged in the Task 9 extraction. `UnassignedContainer`'s prop rename from `search`/`onSearchChange` to `hasFilter` happens once, in Task 5, carried through Task 10.
- **No placeholders:** the one intentionally-broken intermediate snippet in Task 6 Step 8 is explicitly called out as wrong and immediately corrected within the same step, with the final correct code given in full — it's a scaffolding note for *why* the extra `tableOccupants` prop is needed, not a stray TODO left in the plan.
