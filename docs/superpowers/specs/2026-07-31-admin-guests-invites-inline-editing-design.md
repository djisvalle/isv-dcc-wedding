# Admin Guests & Invites Inline Editing & Panel Redesign — Design

Status: Approved (pending spec review)
Date: 2026-07-31
Sub-project 3 of the wedding-website overhaul (RSVP portal performance [done] →
admin data layer, split into 2a [Guests+Invites, done] and 2b [remaining 5
admin pages, not started] → **admin UI/UX overhaul**, itself scoped to
Guests+Invites only for this pass)

## Context

Sub-projects 1 and 2a are complete: the RSVP portal is performance-optimized,
and `AdminGuests.tsx`/`AdminInvites.tsx` now run on a shared, memoized data
layer (`GuestsProvider`/`InvitesProvider`, batched writes, `React.memo`'d row
components). Sub-project 2b (data-layer work for `AdminDashboard`,
`AdminBudget`, `AdminReports`, `AdminTables`, `AdminWaitingList`) was
explicitly skipped in favor of moving to the UI/UX overhaul now.

Because of that skip, this sub-project is scoped to **Guests + Invites UI
only** — the two pages with a clean, already-migrated data layer to build on.
The other five admin pages keep their current UI and data layer untouched;
redesigning their UI on top of an unmigrated data layer was rejected as
higher-risk and likely to need a second pass once/if sub-project 2b happens.

### Motivation

`AdminGuests.tsx`/`AdminInvites.tsx` are already functionally complete
(search, multi-filter, pagination, bulk actions, per-row quick-status
buttons, modal add/edit, Excel import/export, copy-link/copy-message). This
pass addresses two things equally, not a functionality gap:

1. **Visual polish** — the UI works but reads as generic/default shadcn
   styling rather than an intentional design pass.
2. **Workflow friction** — editing a guest or invite requires opening a
   modal for even a one-field change (e.g., fixing a typo in a name).

### Priority: inline editing

Of the possible workflow improvements (inline editing, search/filter
improvements, bulk-action/table ergonomics), **inline editing** was chosen as
the one to fix in this pass — it directly addresses the most common edit
action (small field corrections) with the fewest clicks, and is scoped
tightly enough to ship as one focused pass rather than trying to fix
everything about the admin tables at once. Search/filter and bulk-action
ergonomics are deferred to a future pass.

### Explicitly out of scope for this sub-project

- **`AdminDashboard`, `AdminBudget`, `AdminReports`, `AdminTables`,
  `AdminWaitingList`** — UI and data layer both untouched. Sub-project 2b's
  job, if/when it happens.
- **Search/filter UX improvements, bulk-action ergonomics, sticky headers,
  column visibility toggles** — named as possible follow-ups during
  brainstorming, explicitly deferred; only inline editing is in scope here.
- **A visual rebrand.** The existing wedding-gold/slate design language
  stays; this pass tightens spacing/hover-affordance/consistency within that
  language, not a new look.
- **Automated/unit testing.** Same as sub-projects 1 and 2a: manual
  verification only, no test runner introduced.

## Key Decisions (from brainstorming)

- **Field scope:** `name`/`nickname` become inline-editable directly in the
  table cell. Role, table assignment, invite group, and the baby/parent
  fields stay in a dedicated panel (see below) since they involve
  dropdowns/conditional logic that don't fit cleanly into a table cell.
- **Panel pattern:** the existing centered `Dialog` for guest/invite editing
  becomes a `Sheet` (shadcn's slide-over panel — already a dependency,
  already used in `AdminLayout`'s mobile nav) — lighter-weight than a modal,
  still a separate, focused view, no new UI library needed.
- Rejected alternatives: per-field `Popover`s instead of a consolidated panel
  (more literally "inline" but painful when editing 3+ fields on one guest
  at once); leaving the modal untouched (ships faster but doesn't address
  the "modal feels heavy" friction that was explicitly named).

## Design

### 1. Architecture & Components

**New shared primitive:** `EditableCell` (`src/components/admin/EditableCell.tsx`)
— renders as plain text by default; a click swaps it to an `<Input>`;
Enter/blur commits via a passed-in `onSave(newValue)`; Escape cancels
without committing. Used by both `GuestRow`'s name/nickname cells and
`InviteRow`'s name cell — one shared piece of UI infrastructure instead of
duplicating click/commit logic per row component.

**`GuestRow.tsx`** (already extracted in sub-project 2a) gains local
"which cell is being edited" state. `AdminGuests.tsx` gains a new
`onUpdateField(id, field, value)` callback passed down to it; no other
changes to `AdminGuests.tsx`'s existing structure.

**Guest edit panel:** the existing edit-`Dialog`'s form (role, table
type/number, invite group, baby/parent fields) moves to a `Sheet`, with
`name`/`nickname` removed from it (they're edited inline instead).

**`InviteRow.tsx`** gets inline editing for its one simple field (`name`).
The existing guest-assignment sub-workflow (search/add/remove guests from an
invite) moves from `Dialog` to `Sheet` but keeps its current internal
structure unchanged — it's a genuinely complex workflow, not a flat form,
so changing its container doesn't simplify it further.

### 2. Data Flow & Commit Behavior

Single-field inline edits get their own narrow commit path — a direct
`updateDoc(doc(db, 'guests'|'invites', id), { [field]: value, updated_at:
serverTimestamp() })` in the component — separate from the existing
whole-form `handleEditGuest`/`handleEditInvite` handlers, which keep
committing every panel field at once on submit. This mirrors sub-project
2a's precedent: single-doc CRUD stays a direct Firestore call in the
component, not routed through `guestsApi.ts` (scoped to batched multi-item
operations).

**Optimistic feel, not literal optimistic state:** while a cell is being
edited, the `<Input>` itself holds the in-progress value. On commit, the
cell exits edit mode; the confirmed value then comes from
`GuestsProvider`/`InvitesProvider`'s live `onSnapshot` within a normal
round-trip. On failure: revert the input to the pre-edit value, exit edit
mode, `toast.error(...)` — consistent with every other write-failure path
in this app; no special retry-in-place flow.

### 3. Visual Design & Error Handling/Testing

**Visual direction:** stay within the existing wedding-gold/slate design
language (no rebrand). Add a subtle hover affordance to editable cells
(e.g. a faint underline or pencil icon on hover) so editability is
discoverable rather than guessable. Keep the new `Sheet` panels visually
consistent with the app's existing `Sheet` usage in `AdminLayout`'s mobile
nav. Tighten spacing inconsistencies in the row components while already
touching them for this work — not a scope expansion, just cleanup that
falls naturally out of the edit.

**Error handling:** covered above — revert + toast on inline-cell failure.
The `Sheet` panel's full-form submit keeps its existing
`handleFirestoreError`/toast behavior unchanged, just in a different
container.

**Testing:** manual only, consistent with the rest of this project. Concrete
checks: click a name/nickname cell, edit, confirm it commits and reflects
correctly; confirm Escape cancels without committing; confirm the `Sheet`
panel opens/closes correctly and its full-form submit still works exactly
as the modal did; confirm mobile-viewport rendering of both the inline
cells and the `Sheet`.

## Success Criteria

- `name`/`nickname` are editable directly in the table for both guests and
  invites, without opening any dialog/panel.
- Editing role/table/invite-group/baby-parent fields opens a `Sheet`
  instead of a centered `Dialog`, with identical field coverage to today.
- No change to `AdminDashboard`/`AdminBudget`/`AdminReports`/`AdminTables`/
  `AdminWaitingList` — untouched, both UI and data layer.
- No visual rebrand — existing design language preserved, tightened.
