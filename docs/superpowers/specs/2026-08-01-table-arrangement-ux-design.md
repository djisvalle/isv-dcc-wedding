# Table Arrangement Page: Filters, Capacity, Bulk Assign & Polish

## Context

`src/pages/admin/AdminTables.tsx` is a drag-and-drop seating board: an "Unassigned" sidebar and a grid of table cards, built on `@dnd-kit`. It currently has no filtering beyond a name search scoped to the unassigned sidebar, no concept of table capacity, no bulk actions, and no export. This spec adds those, scoped to this page only (no changes to `AdminGuests.tsx` or the `Guest` type, other than none needed — capacity lives on `Table`, not `Guest`).

## Goals

1. A single filter bar that narrows both which tables are shown and which guests are shown within them.
2. Per-table seat capacity with a soft (non-blocking) visual warning when exceeded.
3. Multi-select bulk assignment of unassigned guests to a table.
4. A print-friendly seating chart output.
5. General interaction polish (empty states, transitions, consistent counts).

## 1. Data model change

`Table` gains an optional field:

```ts
interface Table {
  id: string;
  type: 'bridal' | 'vip' | 'regular';
  number: string;
  capacity?: number; // undefined = uncapped
}
```

Defaults applied when a table is created (via "Add Table" dialog) or first derived from a guest with no prior saved layout entry:
- `regular` → 10
- `vip` → 6
- `bridal` → uncapped (`undefined`)

`persistTableLayout` already serializes `{ id, type, number }` for every active table — extend it to also persist `capacity`. `mergeTables` dedupes by id, first-occurrence-wins; no change needed there since capacity travels with the table object.

Tables derived purely from guest assignments (not yet in saved layout) get the type-based default capacity applied at render/read time, not written until the user actually edits it (avoids spurious writes on every guest change).

## 2. Filter bar

Rendered once, below the existing page header (title + stat tiles + Add Table button), full width, styled consistently with the filter row already in `AdminGuests.tsx` (`Label` + native `<select>`, white bg, rounded-xl, no border, shadow-sm).

State lives in `AdminTables` (parent) and is passed down to both the sidebar and the table grid — this replaces the sidebar's private `guestSearch` state, which is removed.

Controls:
- **Search** — text input, matches guest `name`, `nickname`, `role` (case-insensitive substring), same matcher already used for unassigned search and the assign-dialog search.
- **Table type** — `all | bridal | vip | regular`.
- **Role** — `all | guest | <each role in GUEST_ROLES-equivalent list found in guest data>`. Reuse the same "guest" sentinel meaning "no role" as `AdminGuests.tsx`'s `roleFilter`.
- **Capacity status** — `all | room | full | over`, computed per table (see §3).
- **Clear filters** — appears only when any control is non-default; resets all four.

### Filtering semantics

A table card is visible when ALL of:
- type filter matches (or `all`)
- capacity-status filter matches (or `all`)
- if search or role filter is active: at least one guest currently seated at that table matches; if search/role are both `all`, this condition is vacuously true.

When a table is visible and a guest-level filter (search or role) is active, the card renders only the matching guests (not the full roster), and the header count reads `"{matching} of {total} guests"` instead of the plain count. When no guest-level filter is active, it's just `"{total} guests"` as today.

The **Unassigned** sidebar (desktop panel and mobile sheet) applies the same search + role predicate to its list (type/capacity filters don't apply to it — those concern tables, and unassigned guests aren't at any table).

**Not filtered by any of this:** the destination-table lists in the per-guest quick-move dropdown, the per-table "Quick Assign" dialog's table context (implicit — it's already scoped to one table), and the bulk-assign target dropdown (§4). Filters shape the view; they never hide a valid drop/assignment target.

**Stat tiles** (header "Tables" / "Unassigned" counts) continue to reflect true totals, not filtered counts — they're a reliability anchor, not a filtered view.

## 3. Table capacity UI

In `DroppableTable`'s `CardHeader`, replace the current plain `"{n} Guests"` line with:

- A capacity line using the `EditableCell` click-to-edit pattern (`src/components/admin/EditableCell.tsx`): displays `"{occupants} / {capacity} Guests"` when capacity is set, or `"{occupants} Guests · Uncapped"` when not. Clicking it turns it into a numeric `Input` (empty = uncapped, matching `EditableCell`'s `allowEmpty`); committing calls a new `onUpdateCapacity(tableId, capacity | undefined)` prop that updates `activeTables` state and calls `persistTableLayout`.
- A slim 2px progress bar directly under the header content, width = `min(occupants / capacity, 1) * 100%`, only rendered when capacity is set.
- Color/state derived from `occupants` vs `capacity`:
  - no capacity set → neutral, no bar, no ring
  - `occupants < capacity` → slate/gold progress fill (existing palette), no ring
  - `occupants === capacity` → amber fill, no ring ("full" but not over)
  - `occupants > capacity` → rose fill, rose ring around the `Card` (same treatment class pattern as the existing gold `isOver` drag ring), plus a small `AlertTriangle`-style icon next to the count with a `title` tooltip: `"{n} over capacity"`.
- This is purely a visual signal. No drag/drop, quick-move, quick-assign, or bulk-assign action is blocked by capacity. `toast` messages are unaffected.

`countOccupants` (already excludes babies/children from the headcount) is the basis for `occupants` here — capacity counts the same way, since a baby/child seated at a table without an assigned seat shouldn't count against the room's assumed adult capacity.

### Add Table dialog

Add a `Capacity` number input to the existing form, pre-filled per the type defaults in §1 whenever `newTable.type` changes (only if the user hasn't already hand-edited it this session — simplest correct behavior: pre-fill on type change only while the field is still at its previous type's default value or empty), and included in the `handleAddTable` payload.

## 4. Bulk assign

`SortableGuestItem`, when rendered inside the Unassigned sidebar (desktop + mobile) only, gets a leading `Checkbox` (from `@/components/ui/checkbox`, already used in `AdminGuests.tsx`) wired to a `selectedIds: string[]` state owned by `AdminTables`. The checkbox sits before the drag handle and stops propagation so it doesn't start a drag.

When `selectedIds.length > 0`, the sidebar's "Unassigned" title row is replaced by a floating action row:

```
[N selected]   [Assign to table ▾]   [Clear]
```

- "Assign to table" is a `DropdownMenu` listing every active table (bridal/VIP/regular, in the existing `sortTables` order) with a right-aligned occupancy readout, e.g. `VIP 2 · 4/6` (or `7 guests` if uncapped) — same label logic as the existing per-guest quick-move menu.
- Choosing a table calls a new `handleBulkAssign(guestIds: string[], tableId: string)` that mirrors `handleQuickMove`'s Firestore update but batches via `commitInChunks` (already imported, used in `handleDragEnd`) since it can be N guests at once — appending them after the target table's current max `table_order`, in their current sidebar order.
- On success: single `toast.success` (e.g. `"3 guests assigned"`), `selectedIds` clears.
- Selection auto-clears whenever the filtered unassigned list changes such that a selected guest is no longer present (filter change, or the guest got assigned some other way) — recompute by intersecting `selectedIds` with the currently visible unassigned guest ids.

No bulk-unassign / bulk-move-between-tables in this round — out of scope, kept for a future pass if needed.

## 5. Print / export seating chart

A "Print Seating Chart" button (outline style, matching the existing "Export XLSX" button treatment in `AdminGuests.tsx`) in the page header actions row. `onClick` calls `window.print()`.

A print stylesheet (Tailwind `print:` utility variants, no new CSS file needed) applied to the existing JSX:
- `print:hidden` on: the filter bar, the Add Table / Print buttons, the Unassigned sidebar, the mobile FAB, all per-card interactive controls (quick-assign `+` button, delete button, per-guest `+` dropdown trigger, drag handles), and the capacity edit affordance (render capacity as plain text in print).
- Table grid switches to a print-friendly multi-column block layout (`print:grid-cols-2` or similar) so it paginates cleanly instead of relying on screen breakpoints.
- Each table renders its title, capacity summary, and a plain guest name list (one per line) — no drag affordances, no dropdown triggers, since those are inert in print anyway and `print:hidden` removes them.

This uses the browser's native print/"Save as PDF", consistent with not adding a new PDF dependency; `ExcelJS` (already a dependency, used in `AdminGuests.tsx`) is not reused here since the export goal here is a physical/PDF seating chart, not a data spreadsheet.

## 6. Interaction polish

- **Empty states**: distinguish three cases in the table grid — (a) no tables exist at all (today's message, unchanged), (b) tables exist but none match the active filters (new: `"No tables match your filters"` + a `Clear filters` button), (c) unassigned list empty due to filtering vs. actually empty (new: `"No unassigned guests match your filters"` vs. today's "Done!" state).
- **Transitions**: table cards that appear/disappear due to filter changes get the existing `animate-in fade-in` treatment (already imported via Tailwind's `tailwindcss-animate`-style utility classes used elsewhere in this file) rather than popping instantly.
- **Consistency**: mobile FAB badge count and header stat tiles continue to show true totals (§2 note), so filtering never makes the "how many unassigned overall" signal lie.

## Non-goals (explicitly out of scope this round)

- Editing the type/number of a table that already has guests (still add-empty / delete-empty only).
- Bulk unassign or bulk move between tables.
- Hard-blocking overbooked assignment.
- Any change to `Guest` type or Firestore rules.
- Auto-arrange / auto-balance seating.

## Testing notes

- Manual verification in-browser (this is a UI-heavy admin tool with live Firestore data): filter combinations (type × role × search × capacity status), capacity edit persisting across reload, bulk assign updating `table_order` correctly and not colliding with concurrent drag-and-drop, print layout via browser print preview, mobile sheet behavior unchanged.
- No existing automated test coverage for this page (confirmed no `AdminTables.test.*`); this spec doesn't introduce one, consistent with the rest of the admin section.
