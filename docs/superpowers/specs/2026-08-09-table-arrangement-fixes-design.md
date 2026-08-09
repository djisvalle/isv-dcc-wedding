# Table Arrangement: Search Bug Fix, Unassign All, Drag-Order Fix

## Context

`src/pages/admin/AdminTables.tsx` (with `src/components/admin/tables/*`) is the drag-and-drop seating board built on `@dnd-kit`, most recently extended by `docs/superpowers/specs/2026-08-01-table-arrangement-ux-design.md` (filters, capacity, bulk assign, print). This spec covers three follow-up fixes/improvements scoped to this same page:

1. A misleading "ghost" table appearing during search.
2. A new per-table "unassign all" action.
3. A drag-and-drop ordering bug where a guest dropped below another guest can still land above them.

The fourth item from the original request — a free-form drag-and-drop floor-plan canvas — is a separate, larger effort and gets its own spec (`2026-08-09-table-floor-plan-design.md`).

## 1. Bug fix: empty table shows as a false search match

**Root cause:** `visibleTables` ([AdminTables.tsx:191-207](../../../src/pages/admin/AdminTables.tsx#L191-L207)) hides a table under an active search/role filter only if it has guests and *none* match (`tableGuests.length > 0 && !tableGuests.some(matchesGuestFilters)`). A table with zero guests is never hidden — intentional, so it stays available as a drag target while filtering. But this means: unassign a guest from Table 5, and Table 5 (now empty) will appear under *any* subsequent search — including a search for the very guest who used to sit there — which reads as if the guest is still tied to that table.

**Fix:** keep the existing visibility rule (empty tables stay visible as drop targets), but distinguish this state visually so it can't be mistaken for a real match:

- `AdminTables` computes, per visible table, whether it's showing *only* because it's empty during an active filter: `hasGuestFilter && countOccupants === 0`.
- Pass this down to `DroppableTable` as a new boolean prop, e.g. `isEmptyMatch`.
- When true, `DroppableTable` renders the card at reduced opacity (e.g. `opacity-60`) and swaps its normal `"{n} Guests"` header line for a short caption: `"No matches — shown as empty drop target"`.
- No change to the filtering predicate itself, no change to drag/drop behavior — this is a display-only fix.

## 2. Unassign-all (per table)

- A new icon button in `DroppableTable`'s header actions row, alongside the existing Quick Assign (`+`) and delete (`Trash2`) buttons. Rendered only when `allTableGuests.length > 0`.
- **Confirmation:** arm-then-confirm, no dialog. First click swaps the button to a "Confirm?" state (different icon/label, e.g. rose-tinted) for ~3 seconds; a second click within that window executes the action; if the window elapses or the user clicks elsewhere, it silently reverts to the normal icon. Implemented as local component state (`isArmed` + a `setTimeout`/cleanup) — no new shared dialog component, consistent with the fact that no `AlertDialog` pattern exists anywhere else in this codebase today.
- **Action:** a new `handleUnassignAll(tableId: string)` in `AdminTables`, mirroring `handleBulkAssign`'s shape but in reverse — for every guest currently at that table, write `table_type: null, table_number: null, table_order: <appended after current max table_order among already-unassigned guests>, updated_at: serverTimestamp()`, batched via the existing `commitInChunks` helper (already used by `handleDragEnd`/`handleBulkAssign`). Single `toast.success` on completion, e.g. `"5 guests unassigned"`.
- No change to the `Guest` schema or Firestore rules — this reuses the exact same three fields every other unassign path already writes.

## 3. Drag-order fix: guest always lands above the drop target

**Root cause:** In `handleDragEnd` ([AdminTables.tsx:352-357](../../../src/pages/admin/AdminTables.tsx#L352-L357)), when dropping onto another guest row, the insertion index is always that guest's current index in the target list (`overIndex = newList.findIndex(g => g.id === overId)`), and the dragged guest is spliced in at that index. This always inserts *before* the target guest, regardless of whether the pointer was released over the top or bottom half of that row — so dragging Guest A down past Guest B and releasing still leaves A above B.

**Fix:** apply direction-aware insertion, the standard pattern for cross-container `@dnd-kit` sortable lists:

- At drop time, compare the active (dragged) item's translated rect (`active.rect.current.translated`) against the over item's rect (`over.rect`) at the point of drop.
- If the active item's vertical center is past the over item's vertical midpoint (i.e. the drop happened on the bottom half of the target row), insert *after* the target (`overIndex + 1`); otherwise insert before it (`overIndex`), which is today's behavior.
- This only changes the index computed for insertion — the existing `table_order` field, the `commitInChunks` batch write, and the rest of `handleDragEnd`'s logic (table-membership change, same-position no-op check) are unchanged.
- Applies uniformly whether the drop target is in the same table, a different table, or the Unassigned list, since all three already funnel through the same `newList`/`overIndex`/splice logic.

## Non-goals (explicitly out of scope this round)

- The floor-plan canvas (separate spec).
- Any change to the `Guest` or `Table` schema.
- Any change to bulk-*assign* behavior (already shipped).
- A shared/reusable confirmation dialog component — the arm-then-confirm pattern here is local to this one button; introducing a general dialog primitive is unrelated scope.

## Testing notes

- Manual verification in-browser, consistent with the rest of this page (no existing automated test coverage for `AdminTables.tsx`):
  - Assign a guest to a table, unassign them (via dropdown or drag), then search their name — confirm their old table now shows the dimmed "empty drop target" state instead of looking like a match, and that it's still a valid drop target.
  - Unassign-all on a table with several guests: confirm arm-then-confirm timing (executes on 2nd click within the window, reverts if not confirmed in time), guests land in Unassigned, `table_order` values don't collide with guests already there.
  - Drag a guest and drop it on the bottom half of another guest's row (same table, cross-table, and into Unassigned) — confirm it lands *after* the target, not before; drop on the top half — confirm it still lands before, as today.
