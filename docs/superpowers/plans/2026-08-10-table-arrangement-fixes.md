# Table Arrangement Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "ghost" empty-table search match, add a per-table "unassign all" action, and fix a drag-and-drop ordering bug on the Table Arrangement admin page (`/admin/tables`).

**Architecture:** All three changes are localized to two existing files — `src/pages/admin/AdminTables.tsx` (page-level state/handlers/Firestore writes) and `src/components/admin/tables/DroppableTable.tsx` (the per-table card component). No new files, no new components, no data model changes.

**Tech Stack:** React 18, TypeScript, `@dnd-kit/core`/`@dnd-kit/sortable` for drag-and-drop, Firebase Firestore (`firebase` v10) for persistence, Tailwind CSS for styling, `sonner` for toasts, `lucide-react` for icons.

## Global Constraints

- No changes to the `Guest` or `Table` TypeScript interfaces, and no Firestore security rule changes — see `docs/superpowers/specs/2026-08-09-table-arrangement-fixes-design.md`.
- No new dialog/modal component — the codebase has no `AlertDialog` pattern anywhere today; the unassign-all confirmation must be a local, in-button "arm-then-confirm" state, armed for **3 seconds**.
- Firestore writes must go through the existing `commitInChunks` helper (`src/lib/firestoreBatch.ts`) when writing multiple guest docs, and through `reportWriteError` (already defined in `AdminTables.tsx`) for error handling — both are already used by `handleQuickMove`/`handleBulkAssign`/`handleDragEnd`. Do not introduce a different error-handling or batching pattern.
- This project has **no automated test framework** (no `vitest`/`jest` dependency, no test scripts in `package.json`, no existing `*.test.*` files anywhere in `src/`). Every task in this plan is verified by running the dev server (`npm run dev`, default `http://localhost:3000`) and manually exercising the change on the real page at `/admin/tables` (requires an authenticated admin session) — this matches the existing "Testing notes" convention already used by every prior spec/plan for this page. Do not add a test framework or test files as part of this plan.
- Follow existing styling conventions in the two files being touched: Tailwind utility classes only, no new CSS files, icons from `lucide-react`, `toast.success`/`toast.error` from `sonner` for user feedback.
- Commit after each task with the codebase's existing commit style (short imperative summary, no body needed for changes this small).

---

## Task 1: Dim and label the "empty table shown as search match" state

**Problem:** In `DroppableTable.tsx`, when a search/role filter is active on the page, a table with zero guests is always rendered (by `AdminTables.tsx`'s `visibleTables` filter) even though nothing in it matches — including right after you unassign a guest from it, which reads as if the guest is still tied to that table. The fix is presentational only: dim the card and add a small caption when this specific state occurs, computed locally inside `DroppableTable` from props it already receives.

**Files:**
- Modify: `src/components/admin/tables/DroppableTable.tsx`

**Interfaces:**
- Consumes: existing props `hasGuestFilter: boolean` and `allTableGuests: Guest[]` (both already passed in from `AdminTables.tsx` — no prop changes needed).
- Produces: no new exports; purely internal render logic.

- [ ] **Step 1: Reproduce the bug in the running app**

Run: `npm run dev`, then in a browser go to `http://localhost:3000/admin/tables` (log in as admin first if prompted).
- Assign any guest to a table that currently has no other guests (drag them in, or use the table's `+` Quick Assign button).
- Unassign that same guest (open their row's dropdown via the icon next to their name → "Unassign Guest").
- Type that guest's name into the page's top search box.
- Expected (current buggy behavior): the guest's old table card still appears in the grid, with no visible indication it doesn't actually contain a match — it looks identical to a table with 0 guests you never touched.

- [ ] **Step 2: Add the `isEmptyMatch` calculation**

In `src/components/admin/tables/DroppableTable.tsx`, find this existing line inside the component body (currently around line 61-63):

```tsx
  const countOccupants = allTableGuests.filter(g => !g.is_baby_or_child).length;
  const capacity = getEffectiveCapacity(table);
  const status = getCapacityStatus(countOccupants, capacity);
```

Add a new line directly after it:

```tsx
  const countOccupants = allTableGuests.filter(g => !g.is_baby_or_child).length;
  const capacity = getEffectiveCapacity(table);
  const status = getCapacityStatus(countOccupants, capacity);
  const isEmptyMatch = hasGuestFilter && allTableGuests.length === 0;
```

Note: this intentionally uses `allTableGuests.length` (the raw count, including babies/children), not `countOccupants`, because that's exactly the condition `AdminTables.tsx`'s `visibleTables` memo uses to decide whether to force-show an otherwise-filtered-out table (`tableGuests.length > 0 && !tableGuests.some(matchesGuestFilters)` — i.e. it only force-shows when the raw list is empty).

- [ ] **Step 3: Dim the card when `isEmptyMatch` is true**

Find the `Card` element's `className` (currently around line 110-113):

```tsx
      <Card className={`
        h-full border-slate-200/60 shadow-sm transition-all rounded-3xl overflow-hidden group
        ${isOver ? 'ring-2 ring-wedding-gold scale-[1.02] bg-wedding-gold/5' : status === 'over' ? 'ring-2 ring-rose-300' : ''}
      `}>
```

Change the interpolated class expression to also apply `opacity-60` when `isEmptyMatch` is true (and not while actively being dragged over — an active drop target should never look dimmed):

```tsx
      <Card className={`
        h-full border-slate-200/60 shadow-sm transition-all rounded-3xl overflow-hidden group
        ${isOver ? 'ring-2 ring-wedding-gold scale-[1.02] bg-wedding-gold/5' : status === 'over' ? 'ring-2 ring-rose-300' : ''}
        ${isEmptyMatch && !isOver ? 'opacity-60' : ''}
      `}>
```

- [ ] **Step 4: Add the caption**

Find this existing block (currently around line 127-131):

```tsx
                {hasGuestFilter && countOccupants > 0 && (
                  <p className="text-[9px] text-wedding-gold/80 font-bold uppercase tracking-widest">
                    {visibleGuests.filter(g => !g.is_baby_or_child).length} of {countOccupants} shown
                  </p>
                )}
```

Add a new sibling block directly after it (these two are mutually exclusive — `isEmptyMatch` requires `allTableGuests.length === 0`, so `countOccupants` is also `0`, so only one of the two can ever render):

```tsx
                {hasGuestFilter && countOccupants > 0 && (
                  <p className="text-[9px] text-wedding-gold/80 font-bold uppercase tracking-widest">
                    {visibleGuests.filter(g => !g.is_baby_or_child).length} of {countOccupants} shown
                  </p>
                )}
                {isEmptyMatch && (
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest italic">
                    No matches — shown as empty drop target
                  </p>
                )}
```

- [ ] **Step 5: Verify the fix in the browser**

Repeat Step 1's repro exactly. Expected now: the old (empty) table card renders visibly dimmed, with "No matches — shown as empty drop target" where the guest count used to be. Also verify:
- Dragging a guest onto that dimmed table still works (it must remain a live drop target — hover it mid-drag and confirm the gold ring/highlight (`isOver` state) still appears and overrides the dimming, matching the `!isOver` condition in Step 3).
- Clear the search box: the table returns to its normal (non-dimmed, plain guest-count) appearance.
- A table that legitimately has a matching guest still renders normally (not dimmed, no "No matches" caption) — confirms the two states didn't get inverted.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/tables/DroppableTable.tsx
git commit -m "fix: dim and label empty tables shown as search matches"
```

---

## Task 2: Fix drag-and-drop insertion to respect drop direction

**Problem:** In `AdminTables.tsx`'s `handleDragEnd`, dropping a guest onto another guest's row always inserts the dragged guest *before* the target, regardless of whether the drop happened on the top or bottom half of that row. Dragging Guest A down past Guest B and releasing still leaves A above B.

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`

**Interfaces:**
- Consumes: `DragEndEvent` from `@dnd-kit/core` (already imported and used as the `handleDragEnd` parameter type) — specifically `event.active.rect.current.translated` (a `ClientRect | null`) and `event.over.rect` (a `ClientRect`), both provided by `@dnd-kit/core` with no additional setup.
- Produces: no new exports; purely internal logic inside the existing `handleDragEnd` function.

- [ ] **Step 1: Reproduce the bug in the running app**

Run: `npm run dev` (if not already running from Task 1), go to `http://localhost:3000/admin/tables`.
- Make sure some table (or the Unassigned list) has at least 3 guests in it, e.g. Guest A, Guest B, Guest C in that order.
- Drag Guest A and drop it on the **bottom half** of Guest C's row (i.e. drag it down past both B and C, releasing just below C's midpoint — the intent is "put A after C").
- Expected (current buggy behavior): A ends up positioned *before* C (typically between B and C), not after it — the order doesn't match where you dropped it.

- [ ] **Step 2: Update the insertion-index calculation**

Find this block inside `handleDragEnd` (currently around line 351-360):

```tsx
    // Find insertion index
    let overIndex = -1;
    if (overData?.type === 'guest') {
      overIndex = newList.findIndex(g => g.id === overId);
    } else {
      overIndex = newList.length;
    }

    // Insert active guest at the right position
    newList.splice(overIndex >= 0 ? overIndex : newList.length, 0, activeGuest);
```

Replace it with:

```tsx
    // Find insertion index. When dropping onto another guest's row, whether
    // we insert before or after that guest depends on which half of the row
    // the drop landed on — closestCenter collision detection only tells us
    // *which* row we're over, not which side of its midpoint, so we compare
    // the dragged item's translated rect against the target row's rect here.
    let overIndex = -1;
    if (overData?.type === 'guest') {
      const baseIndex = newList.findIndex(g => g.id === overId);
      const activeRect = active.rect.current.translated;
      const overRect = over.rect;
      const isBelowOverItem = !!(
        activeRect &&
        overRect &&
        activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2
      );
      overIndex = baseIndex >= 0 ? baseIndex + (isBelowOverItem ? 1 : 0) : newList.length;
    } else {
      overIndex = newList.length;
    }

    // Insert active guest at the right position
    newList.splice(overIndex >= 0 ? overIndex : newList.length, 0, activeGuest);
```

- [ ] **Step 3: Verify the fix in the browser**

Repeat Step 1's repro exactly. Expected now: dropping Guest A on the bottom half of Guest C's row places A *after* C. Also verify:
- Dropping on the **top half** of a row still inserts before it, as it always did (drag Guest C and drop on the top half of Guest A's row — C should land before A).
- Cross-table drags still work: drag a guest from one table onto a specific row in a different table, both top-half and bottom-half, and confirm the guest lands in the target table at the expected position and its `table_type`/`table_number` update correctly (check via the guest's row — it should now render inside the new table's card).
- Dragging a guest onto the Unassigned list (not onto another guest's row) still appends it, unaffected by this change (this path doesn't go through the `overData?.type === 'guest'` branch).
- Dropping a guest back into the exact same position it started in still results in **no** Firestore write and no `"Arrangement updated"` toast (the existing same-position no-op check a few lines below this block, `isSameTable && oldIndexInCurrentTable === overIndex`, must still correctly detect true no-ops — this should already hold given the new `overIndex`, but confirm by dropping a guest a few pixels away from its own original position without crossing the midpoint of the guest above or below it, and watching that no toast/save fires).

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminTables.tsx
git commit -m "fix: drag-and-drop insertion respects drop direction (above/below target)"
```

---

## Task 3: Add per-table "unassign all" action

**Problem:** There is currently only a single-guest unassign action (per-guest dropdown → "Unassign Guest"). Add a button on each table card that unassigns every guest currently seated there in one action, with an in-place "arm-then-confirm" interaction (no dialog) since it affects multiple guests at once.

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx` — new `handleUnassignAll` handler, wired into the existing `DroppableTable` usage.
- Modify: `src/components/admin/tables/DroppableTable.tsx` — new button + local arm/confirm state.

**Interfaces:**
- Produces (in `AdminTables.tsx`): `handleUnassignAll: (tableId: string) => Promise<void>` — batch-unassigns every guest currently at the given table.
- Consumes (in `DroppableTable.tsx`): a new required prop `onUnassignAll: (tableId: string) => void`, called with `table.id` when the user completes the two-click confirmation.

- [ ] **Step 1: Add `handleUnassignAll` to `AdminTables.tsx`**

Find the existing `handleBulkAssign` callback (currently ends around line 297, right before `handleDragStart`). Add a new callback directly after it:

```tsx
  const handleUnassignAll = useCallback(async (tableId: string) => {
    const targetGuests = guestsByTable[tableId] ?? EMPTY_GUESTS;
    if (targetGuests.length === 0) return;

    const unassignedMaxOrder = unassignedGuests.length > 0
      ? Math.max(...unassignedGuests.map(g => g.table_order || 0))
      : -1;

    try {
      const ops = targetGuests.map((g, index) => ({ guest: g, index }));
      await commitInChunks(ops, ({ guest: g, index }, batch) => {
        const guestRef = doc(db, 'guests', g.id);
        batch.update(guestRef, {
          table_type: null,
          table_number: null,
          table_order: unassignedMaxOrder + 1 + index,
          updated_at: serverTimestamp()
        });
      });
      toast.success(`${targetGuests.length} guest${targetGuests.length === 1 ? '' : 's'} unassigned`);
    } catch (err) {
      reportWriteError(err, OperationType.UPDATE, 'guests', 'Could not unassign that table\'s guests — please try again.');
    }
  }, [guestsByTable, unassignedGuests]);
```

This mirrors `handleBulkAssign`'s shape (same `commitInChunks` batching, same error handling via `reportWriteError`), writing the same three fields every other unassign path in this file already writes (`table_type`, `table_number`, `table_order`), appended after the current max order among already-unassigned guests so there's no `table_order` collision with guests already sitting in the Unassigned list.

- [ ] **Step 2: Pass the handler down to `DroppableTable`**

Find where `DroppableTable` is rendered (currently around line 676-687):

```tsx
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
                      isFilteredOut={isFilteredOut}
                    />
```

Add the new prop:

```tsx
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
                      onUnassignAll={handleUnassignAll}
                      isFilteredOut={isFilteredOut}
                    />
```

- [ ] **Step 3: Add the prop to `DroppableTableProps` and the `UserMinus`/`useEffect`/`useRef` imports**

In `src/components/admin/tables/DroppableTable.tsx`, find the props interface (currently lines 26-37):

```tsx
interface DroppableTableProps {
  table: Table;
  allTableGuests: Guest[];
  visibleGuests: Guest[];
  hasGuestFilter: boolean;
  onRemoveTable: (id: string) => void;
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  unassignedGuests: Guest[];
  onUpdateCapacity: (tableId: string, capacity: number | undefined) => void;
  isFilteredOut?: boolean;
}
```

Add `onUnassignAll`:

```tsx
interface DroppableTableProps {
  table: Table;
  allTableGuests: Guest[];
  visibleGuests: Guest[];
  hasGuestFilter: boolean;
  onRemoveTable: (id: string) => void;
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  unassignedGuests: Guest[];
  onUpdateCapacity: (tableId: string, capacity: number | undefined) => void;
  onUnassignAll: (tableId: string) => void;
  isFilteredOut?: boolean;
}
```

Update the two import lines at the top of the file. Change:

```tsx
import React, { useState } from 'react';
```

to:

```tsx
import React, { useState, useEffect, useRef } from 'react';
```

And change the `lucide-react` import (currently lines 7-18):

```tsx
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
```

to add `UserMinus`:

```tsx
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
  UserMinus,
  AlertTriangle
} from 'lucide-react';
```

- [ ] **Step 4: Destructure the new prop and add arm/confirm state**

Find the component signature (currently line 39):

```tsx
export const DroppableTable = React.memo<DroppableTableProps>(({ table, allTableGuests, visibleGuests, hasGuestFilter, onRemoveTable, onQuickMove, availableTables, unassignedGuests, onUpdateCapacity, isFilteredOut = false }) => {
```

Add `onUnassignAll`:

```tsx
export const DroppableTable = React.memo<DroppableTableProps>(({ table, allTableGuests, visibleGuests, hasGuestFilter, onRemoveTable, onQuickMove, availableTables, unassignedGuests, onUpdateCapacity, onUnassignAll, isFilteredOut = false }) => {
```

Find the existing local state block (currently lines 56-59):

```tsx
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [capacityDraft, setCapacityDraft] = useState('');
```

Add the arm/confirm state and its cleanup effect directly after it:

```tsx
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [capacityDraft, setCapacityDraft] = useState('');
  const [isUnassignArmed, setIsUnassignArmed] = useState(false);
  const unassignArmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (unassignArmTimeoutRef.current) clearTimeout(unassignArmTimeoutRef.current);
    };
  }, []);

  const handleUnassignAllClick = () => {
    if (isUnassignArmed) {
      if (unassignArmTimeoutRef.current) clearTimeout(unassignArmTimeoutRef.current);
      setIsUnassignArmed(false);
      onUnassignAll(table.id);
      return;
    }
    setIsUnassignArmed(true);
    unassignArmTimeoutRef.current = setTimeout(() => setIsUnassignArmed(false), 3000);
  };
```

- [ ] **Step 5: Add the button**

Find the header actions row (currently lines 183-252), specifically the delete button at the end of that `<div className="flex items-center gap-1 print:hidden">` block:

```tsx
              {allTableGuests.length === 0 && table.type !== 'bridal' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300 hover:text-red-400 transition-all"
                  onClick={() => onRemoveTable(table.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
```

Add the new button directly before it (it's mutually exclusive with the delete button — this one only renders when `allTableGuests.length > 0`, delete only when `=== 0` — so they never both show):

```tsx
              {allTableGuests.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 transition-all ${isUnassignArmed ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5'}`}
                  title={isUnassignArmed ? `Click again to unassign all ${allTableGuests.length} guests` : 'Unassign all guests from this table'}
                  onClick={handleUnassignAllClick}
                >
                  {isUnassignArmed ? <AlertTriangle className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                </Button>
              )}
              {allTableGuests.length === 0 && table.type !== 'bridal' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300 hover:text-red-400 transition-all"
                  onClick={() => onRemoveTable(table.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev` (if not already running).
- Go to `http://localhost:3000/admin/tables`, find a table with several guests seated.
- Click the new unassign-all icon once — confirm it swaps to a rose-colored alert-triangle icon, and hovering shows a tooltip like "Click again to unassign all 5 guests".
- Wait 4+ seconds without clicking again — confirm it silently reverts to the normal `UserMinus` icon (no action taken, guests unchanged).
- Click once, then click again within 3 seconds — confirm: a `"N guests unassigned"` toast appears, every guest that was at that table now appears in the Unassigned list, and the table card is now empty.
- Confirm no `table_order` collisions: after unassigning, drag one of the newly-unassigned guests within the Unassigned list — it should reorder cleanly with no visual jumping or guests swapping unexpectedly (which would indicate a duplicate `table_order` value).
- Confirm the button does **not** render on an already-empty table (only the delete/trash icon should show there, as before), and does not render inside `window.print()` preview (open print preview and confirm neither this button nor the other header icon buttons appear — they're all inside the same `print:hidden` wrapper).

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminTables.tsx src/components/admin/tables/DroppableTable.tsx
git commit -m "feat: add per-table unassign-all action with arm-then-confirm"
```
