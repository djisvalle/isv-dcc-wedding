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
over a list that can grow (Budget's supplier/payment cards, Waiting List's
guest cards, Tables' `SortableGuestItem`/`DroppableTable`).

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
