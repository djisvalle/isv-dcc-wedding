# Admin Remaining Pages Data Layer (2b) — Design

Status: Approved (pending spec review)
Date: 2026-08-01
Sub-project 2b of the wedding-website overhaul (RSVP portal performance
[done] → admin data layer, split into 2a [Guests+Invites, done] and 2b
[remaining 5 admin pages, this spec] → admin UI/UX overhaul [done, scoped to
Guests+Invites only])

## Context

Sub-project 2a gave `AdminGuests`/`AdminInvites` a shared, memoized,
real-time data layer: `GuestsProvider`/`InvitesProvider` wrapping a single
`onSnapshot` each, batched writes via `src/lib/firestoreBatch.ts`, and
`React.memo`'d row components. `AdminLayout` mounts both providers around
every admin route's `<Outlet/>`.

The other five admin pages — `AdminDashboard`, `AdminBudget`,
`AdminReports`, `AdminTables`, `AdminWaitingList` — were explicitly
deferred at the time (sub-project 2b) in favor of moving to the UI/UX
overhaul. They still have the same problems 2a fixed for Guests/Invites:
redundant per-page `onSnapshot` listeners on collections another page (or
the shared providers) already subscribes to, near-zero memoization, and one
N+1 write pattern.

## Findings from auditing the 5 pages

- **`AdminDashboard`**: no `onSnapshot` at all — polls `getCountFromServer`
  for guest/invite counts on a 30-second `setInterval`. Up to 30s stale,
  and does redundant count queries against collections already live via
  `GuestsProvider`/`InvitesProvider`.
- **`AdminBudget`**: two own listeners (`suppliers`, `payments`), each
  unique to this page today, no memoization.
- **`AdminReports`**: three own listeners — `guests` (fully redundant with
  `GuestsProvider`), `suppliers`, `payments` (duplicated with
  `AdminBudget`) — used only to compute aggregate stats.
- **`AdminTables`**: own `guests` listener (filtered to `is_coming ===
  true`) with a local, narrower `Guest` interface missing `table_order`
  (present on this page's own type, absent from the shared
  `features/guests/types.ts` `Guest`). Its drag-and-drop reorder handler
  (`handleDragEnd`) writes every guest in the affected table individually
  via `Promise.all(newList.map(updateDoc))` — N separate round-trips, no
  atomicity (a failure partway through leaves a partially-reordered table).
- **`AdminWaitingList`**: own `waiting_list` listener, plus a second own
  `guests` listener used only to compute `maxOrder` for the "promote to
  main list" action.

## Scope

One spec, one plan, all 5 pages — the work is uniform in kind (shared
contexts, batch the one N+1 write, memoize) even though it spans several
files, matching how 2a was one plan for its 2 pages.

### Explicitly out of scope

- **Any UI/visual change.** This is a data-layer pass only, matching 2a
  and 2 (RSVP performance): no new fields, no redesign, no new UI library.
- **`AdminWaitingList.handlePromote`**'s existing 2-op `writeBatch` — already
  correct, untouched.
- **`AdminGuests`/`AdminInvites`** — already migrated in 2a, not revisited.
- **Automated/unit testing** — manual verification only, same as every
  prior sub-project.

## Design

### 1. Architecture — new shared contexts & consolidation

- **New:** `features/budget/context/SuppliersProvider.tsx` +
  `PaymentsProvider.tsx` — one `onSnapshot` each on `suppliers`/`payments`,
  same `{items, loading}` shape as `GuestsProvider`/`InvitesProvider`.
- **New:** `features/waitingList/context/WaitingListProvider.tsx` — one
  `onSnapshot` on `waiting_list`.
- `AdminLayout` wraps these three around the existing
  `GuestsProvider`/`InvitesProvider` nesting, outside the keyed
  `motion.div` (per the sub-project 2a fix: providers must not remount on
  route change).
- **`AdminReports`** deletes its own `guests`/`suppliers`/`payments`
  listeners entirely; becomes pure `useMemo` derivation from `useGuests()`
  + `useSuppliers()` + `usePayments()`.
- **`AdminTables`** deletes its own `guests` listener; consumes
  `useGuests()` and derives its `is_coming`-filtered, table-grouped view via
  `useMemo`. Requires adding `table_order?: number` to the shared `Guest`
  type in `features/guests/types.ts`.
- **`AdminDashboard`** deletes its `getCountFromServer` + 30s-interval
  effect; its 5 stat cards become a `useMemo` over `useGuests()` +
  `useInvites()` — real-time instead of polled.
- **`AdminWaitingList`** keeps its own writes to `waiting_list` (single-doc
  CRUD, unchanged) but reads via the new `WaitingListProvider`; its second
  listener (full `guests` collection, used only for `maxOrder`) switches to
  the existing `useGuests()`.

### 2. Data Flow & Batched Writes

One real N+1 fix: `AdminTables.handleDragEnd`'s
`Promise.all(newList.map(g => updateDoc(...)))` becomes a single
`writeBatch`/`commitInChunks` call (reusing `src/lib/firestoreBatch.ts`
from 2a) — one atomic commit instead of N separate round-trips, and fixes
the latent partial-failure bug (today, a failure partway through
`Promise.all` can leave some guests reordered and others not).

Everything else in these 5 pages is single-document CRUD (add/edit/delete
one supplier, one payment, one waiting-list entry, `handleQuickMove`'s
single guest update) — per 2a's precedent, single-doc writes stay direct
`updateDoc`/`addDoc`/`deleteDoc` calls in the component, not routed through
a batch helper. `AdminWaitingList.handlePromote`'s existing 2-op
`writeBatch` is already correct and untouched.

### 3. Memoization & Component Extraction

Memoization happens in the same pass as the context migration, matching
2a's precedent: `useMemo` for derived/filtered/sorted lists (Reports'
aggregates, Tables' table-grouping and unassigned-guest list, Dashboard's
stat cards, Budget's filtered-supplier search, Waiting List's
sorted/filtered list), `useCallback` for handlers passed to child
components, `React.memo` on row/card components rendered in a `.map()`
over a list that can grow — scoped to Tables' `SortableGuestItem`/
`DroppableTable` only. Budget's supplier/payment cards and Waiting List's
guest cards remain inline JSX inside their `.map()` callbacks rather than
standalone components; extracting them purely to attach `React.memo` would
be disproportionate churn for admin lists of this size (YAGNI, consistent
with this project's repeated scope decisions elsewhere). Their
memoization is instead the `useMemo`'d containing arrays noted above —
the array reference is stable across unrelated re-renders even though the
individual card elements are not wrapped in `React.memo`.

Extraction stays minimal, matching 2a's "Minimal extraction" precedent:
`AdminTables.tsx`'s `SortableGuestItem` and `DroppableTable` stay defined
inside the file (not pulled into separate files) — just wrapped in
`React.memo`. No new component files unless a provider's own file needs
one (it doesn't).

### 4. Error Handling & Testing

Unchanged from every prior sub-project: revert-and-`toast.error()` on
write failure via the existing `handleFirestoreError` helper (already used
throughout these 5 pages); new providers set `loading: false` in their
`onSnapshot` error callback (the 2a fix for that exact bug, applied
proactively here). Manual verification only: `npx tsc --noEmit` + `npm run
build`, no test runner introduced.

## Success Criteria

- `AdminDashboard`, `AdminReports`, `AdminTables`, `AdminWaitingList` no
  longer open their own `guests` listener — all read from the existing
  `GuestsProvider` via `useGuests()`.
- `AdminBudget` and `AdminReports` both read `suppliers`/`payments` from
  the new shared `SuppliersProvider`/`PaymentsProvider` — no duplicate
  listeners between the two pages.
- `AdminTables.handleDragEnd` commits its reorder as one atomic batch, not
  N individual `updateDoc` calls.
- `AdminDashboard`'s stats are real-time (derived from shared contexts),
  not polled.
- No UI/visual changes to any of the 5 pages.
- `npx tsc --noEmit` and `npm run build` both pass clean.

## Results

Final verification (Task 10) performed 2026-08-01, after Tasks 1–9 (new
`SuppliersProvider`/`PaymentsProvider`/`WaitingListProvider`; `AdminLayout`
wiring; migration of `AdminDashboard`, `AdminBudget`, `AdminReports`,
`AdminTables`, `AdminWaitingList` onto the shared contexts; the
`AdminTables.handleDragEnd` batched-write fix) were each implemented and
approved. All 9 implementation tasks passed task-level review with zero
unresolved findings; two tasks (Task 8 for `AdminTables`, Task 9 for
`AdminWaitingList`) each caught and self-corrected a real defect in their
own task brief text during implementation (a use-before-declaration
ordering bug in Task 8; an incorrectly-flagged-for-removal `collection`
import in Task 9) — both fixes were verified correct by their task
reviewers, no open issues.

**`npx tsc --noEmit` (whole project):** zero errors, zero output.

**`npx eslint . --report-unused-disable-directives --max-warnings 0`:**
zero output (exit 0). Note from sub-project 2a's Results section still
applies: this repo's `eslint.config.js` applies no rules to `.ts`/`.tsx`
files (a pre-existing gap), so a clean lint run is expected but not
meaningful evidence of correctness on its own — `tsc` and the build are the
signals that matter here.

**`npm run build`:** succeeded (`vite v6.4.2`, "3354 modules transformed",
"✓ built in 12.45s"). Chunk sizes for the 5 migrated pages:

| Chunk | Size | Gzip |
|---|---|---|
| `AdminDashboard` | 3.59 kB | 1.46 kB |
| `AdminWaitingList` | 7.48 kB | 2.61 kB |
| `AdminBudget` | 35.07 kB | 9.55 kB |
| `AdminTables` | 106.50 kB | 35.20 kB |
| `AdminReports` | 420.37 kB | 113.52 kB |

The build emits the same pre-existing chunk-size warning noted in
sub-project 2a's Results section ("Some chunks are larger than 500 kB after
minification", flagging `EditableCell-*.js` at 545.20 kB and
`AdminGuests-*.js` at 979.42 kB) — both are 2a artifacts, unrelated to this
sub-project's changes, and not treated as a blocking signal here. None of
the 5 pages migrated in this sub-project approach that threshold.

**Dangling-reference grep, check 1:**
`grep -rn "getCountFromServer\|onSnapshot(collection(db, 'suppliers')\|onSnapshot(collection(db, 'payments')\|onSnapshot(collection(db, 'waiting_list')" src/pages/admin/AdminDashboard.tsx src/pages/admin/AdminBudget.tsx src/pages/admin/AdminReports.tsx src/pages/admin/AdminTables.tsx src/pages/admin/AdminWaitingList.tsx`
produced no output, confirming `AdminDashboard` no longer polls via
`getCountFromServer` and none of the 5 pages open their own
`suppliers`/`payments`/`waiting_list` listener — all read through the
shared providers wired in Task 4.

**Dangling-reference grep, check 2:**
`grep -n "onSnapshot(collection(db, 'guests')" src/pages/admin/AdminReports.tsx src/pages/admin/AdminTables.tsx src/pages/admin/AdminWaitingList.tsx`
produced no output, confirming these three pages no longer open their own
`guests` listener and instead read through the existing `GuestsProvider`.

**Undocumented counting-semantics change on `AdminDashboard`:** the old
code counted server-side with a Firestore `where('is_baby_or_child', '!=',
true)` query, which in Firestore's query semantics *excludes* documents
where that field is entirely absent. The new client-side
`guests.filter(g => !g.is_baby_or_child)` *includes* documents missing the
field. Any guest doc without `is_baby_or_child` set now counts toward
Dashboard's Total/Attending/Declined/Pending counts where it previously
did not. This is almost certainly the *correct* direction —
`AdminReports` has always used this same client-side falsy-check form, so
Dashboard and Reports previously disagreed with each other and now agree —
but it is an undocumented behavior/numbers change, not a bug: it's an
intentional-in-effect improvement (Dashboard now agrees with Reports)
rather than a regression, called out here so a human reviewing real
production numbers after this ships isn't surprised by a count shift.

**Not verified (no browser automation available in this environment):** a
human must do a live browser walkthrough before treating this plan as fully
verified in production, specifically:

- Live drag-and-drop reorder in `AdminTables` actually persisting via the
  new batched write (including the previously-latent partial-failure case:
  confirming a failure now aborts atomically rather than leaving a
  partially-reordered table).
- The Dashboard's real-time count updates actually reflecting a guest RSVP
  change without a page refresh (replacing the old 30-second
  `getCountFromServer` poll).
- All 5 pages' existing CRUD flows (add/edit/delete supplier, payment,
  waiting-list entry) still working end-to-end in a browser, including
  `AdminWaitingList.handlePromote`'s existing 2-op `writeBatch` (untouched
  by this sub-project, but reading its inputs through the new
  `WaitingListProvider`/`useGuests()` now instead of its own listeners).
- Confirm Dashboard's guest counts match Reports' guest counts on real
  data (they should now, given the counting-semantics change noted above,
  though previously they may not have).
