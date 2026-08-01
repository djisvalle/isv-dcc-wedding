# Admin Remaining Pages UI/UX Pass — Design

Status: Approved (pending spec review)
Date: 2026-08-02
Follows the Budget/Reports/WaitingList removal sub-project. Sibling to the
earlier Guests+Invites inline-editing UI/UX pass — this pass covers the
admin pages that pass didn't touch and that survived the removal.

## Context

The admin panel now has 5 pages: `AdminDashboard`, `AdminGuests`,
`AdminInvites`, `AdminTables`, `AdminSettings` (plus `AdminLayout`, the
shell). `AdminGuests`/`AdminInvites` already got a UI/UX pass (inline
editing, `Sheet` panels, visual tightening). This pass covers the other
three: `AdminDashboard`, `AdminTables`, `AdminSettings`.

### Motivation

Both visual polish and workflow friction matter roughly equally, same
balance as the earlier pass. Unlike that pass, there's no single
pre-named workflow fix to build around (no equivalent of "inline
editing") — this is a general tightening pass, plus one concrete bug
found while reviewing `AdminSettings` during brainstorming: its two
cards (RSVP Deadline, Invite Message Template) each have their own "Save
Changes" button, but both call the same `handleSave()`, which writes
*both* settings' current values via `Promise.all`. Clicking either
button silently saves the other card's in-progress edit too — confirmed
as worth fixing.

### Explicitly out of scope

- **`AdminGuests`/`AdminInvites`** — already migrated, not revisited.
- **New fields, new mechanisms, new UI library.** No inline-editing-style
  new pattern is being introduced here — existing `Card`/`Button`/`Sheet`
  components stay.
- **A visual rebrand.** Same wedding-gold/slate design language as every
  prior sub-project — this pass tightens consistency within it.
- **Automated/unit testing.** Manual verification only, same as every
  prior sub-project.

## Design

### 1. AdminSettings: split the shared save button

`handleSave()` currently does:
```ts
await Promise.all([
  setDoc(doc(db, 'settings', 'rsvp_deadline'), { ... }),
  setDoc(doc(db, 'settings', 'invite_message_template'), { ... })
]);
```
with one `saving` boolean shared by both cards' buttons.

This becomes two independent handlers — `handleSaveDeadline()` and
`handleSaveMessage()` — each writing only its own `settings/*` document,
and two independent `saving` booleans (`savingDeadline`,
`savingMessage`) so each card's button only shows a spinner for its own
in-flight save. No change to what's stored, the document shape, or the
error-handling pattern (`toast.error` + `console.error` on failure) —
purely splitting one combined write into two independent ones.

### 2. Visual polish — AdminDashboard, AdminTables, AdminSettings

Same posture as the Guests+Invites pass: tighten what's inconsistent
while touching each file — spacing, hover-affordance, card treatment —
not a redesign. Specifics aren't pre-enumerated; they get identified per
page during implementation, matching how the earlier pass described this
("tightening spacing inconsistencies... falls naturally out of the edit,
not a scope expansion"). Existing patterns stay: `motion` stagger
animations on card grids, the wedding-gold accent color, shadcn
`Card`/`CardContent`/`CardHeader` components, the `Loader2` loading-spinner
convention. Nothing gets replaced wholesale — no new component library,
no new animation approach.

### 3. Error Handling & Testing

Unchanged from every prior sub-project: `toast.error()` +
`handleFirestoreError`/`console.error` on write failure (the existing
pattern in each of these three files stays as-is for the split
`AdminSettings` handlers). Manual verification only: `npx tsc --noEmit` +
`npm run build`, no test runner introduced.

## Success Criteria

- `AdminSettings`' RSVP Deadline card and Invite Message Template card
  each save independently — saving one does not touch the other's
  Firestore document or show the other card's button as loading.
- `AdminDashboard`, `AdminTables`, `AdminSettings` read as visually
  consistent with `AdminGuests`/`AdminInvites`'s already-polished look —
  no page that visibly reads as "more default shadcn" than the others.
- No new fields, no new UI library, no rebrand.
- `npx tsc --noEmit` and `npm run build` both pass clean.

## Results

All three tasks were each implemented, reviewed, and committed with zero
unresolved findings:

- **Task 1** (`4ba91466`, "fix: split AdminSettings shared save button,
  polish card layout") — split `AdminSettings`' single `handleSave()` /
  shared `saving` boolean into independent `handleSaveDeadline()` /
  `handleSaveMessage()` handlers and `savingDeadline` / `savingMessage`
  booleans, so the RSVP Deadline card and Invite Message Template card
  each write only their own `settings/*` Firestore document and show a
  loading spinner only on their own button; plus visual polish on the
  card layout.
- **Task 2** (`9f7206d5`, "fix: AdminDashboard RSVP Progress card spans
  full width instead of half") — fixed the RSVP Progress card's grid
  placement so it spans the full width of the dashboard instead of
  sharing a row at half width.
- **Task 3** (this task, `e1d708c9`, "style: AdminTables header stat pill
  rounding consistency") — bumped the "Tables / Unassigned" count pill in
  `AdminTables`' page header from `rounded-2xl` to `rounded-3xl`, matching
  the `rounded-3xl` used by every card on that page and by
  `AdminSettings`/`AdminDashboard`'s cards after Tasks 1–2.

**`npx tsc --noEmit` (scoped to `AdminTables.tsx`, Task 3 Step 2):** zero
errors, zero output.

**`npx eslint src/pages/admin/AdminTables.tsx --report-unused-disable-directives --max-warnings 0`
(Task 3 Step 2):** zero output (exit 0).

**`npx tsc --noEmit` (whole project, Task 3 Step 4):** zero errors, zero
output.

**`npx eslint . --report-unused-disable-directives --max-warnings 0`
(whole project, Task 3 Step 4):** zero output (exit 0).

**`npm run build` (Task 3 Step 4):** succeeded (`vite v6.4.2`, "2737
modules transformed", "✓ built in 13.14s"). `AdminTables-DMk9KTeB.js`
(106.60 kB) reflects the one-`className` edit; `AdminDashboard-CJYgf5dd.js`
(3.80 kB) and `AdminSettings-DLGqw9K2.js` (5.14 kB) reflect Tasks 1–2's
changes carried over from prior commits. The build emits the same
pre-existing chunk-size warning noted in every prior sub-project's Results
section ("Some chunks are larger than 500 kB after minification",
flagging `EditableCell-*.js` at 546.08 kB and `AdminGuests-*.js` at
978.19 kB) — both predate this sub-project and are not treated as a
blocking signal here.

**Not verified (no browser automation available in this environment):** a
human must do a live browser walkthrough before treating this pass as
fully verified in production, specifically:

- `AdminSettings`' two cards genuinely save independently — edit both the
  RSVP Deadline and Invite Message Template fields, save only one card,
  refresh the page, and confirm the other field's Firestore value did not
  change.
- `AdminDashboard`'s RSVP Progress card renders full-width on a desktop
  viewport (not sharing a row at half width).
- `AdminTables`' drag-and-drop still works visually unchanged — this task
  only touched one `className` string (the header stat pill's rounding)
  on that page, but a human should confirm dragging guests between tables
  still looks and behaves as before.
