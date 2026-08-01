# Remove Budget, Reports & Waiting List Admin Pages — Design

Status: Approved (pending spec review)
Date: 2026-08-02
Precedes the admin UI/UX pass on the remaining pages (next sub-project).
Sub-project 2b (2026-08-01) had just given `AdminBudget`, `AdminReports`,
and `AdminWaitingList` a shared-context data layer (`SuppliersProvider`,
`PaymentsProvider`, `WaitingListProvider`) — this sub-project removes all
three pages and that data layer before the UI/UX pass, so the pass only
touches pages that are staying.

## Context

The user decided the Budget & Payments page, the Reports page, and the
Waiting List page (plus its embedded "Move to Waiting List" workflow on
the Guest List page) are not wanted in the admin panel. Removing them now
— before the UI/UX pass — avoids polishing UI that's about to be deleted,
and avoids leaving `SuppliersProvider`/`PaymentsProvider`/
`WaitingListProvider` mounted with no consumer.

A full-codebase grep for every symbol/path these three pages and their
data layer touch confirmed the exact removal surface (see Scope below) —
no other page or shared module references any of it beyond what's listed.

## Scope

### Removed entirely

- **Pages:** `src/pages/admin/AdminBudget.tsx`, `AdminReports.tsx`,
  `AdminWaitingList.tsx`.
- **Routes & lazy imports:** the three `<Route>` entries (`waiting-list`,
  `budget`, `reports`) and their `lazy(() => import(...))` declarations in
  `src/App.tsx`.
- **Nav items:** the "Waiting List", "Budget & Payments", and "Reports"
  entries in `AdminLayout.tsx`'s `navItems` array (shared by both the
  desktop sidebar and the mobile sheet nav — one array, one edit).
- **The waiting-list workflow embedded in the Guest List page:**
  - `AdminGuests.tsx`: the `handleMoveToWaitingList` handler, the bulk
    "Move to Waiting List" button (`Hourglass` icon), and the
    `onMoveToWaiting={handleMoveToWaitingList}` prop passed to `GuestRow`.
  - `GuestRow.tsx`: the `onMoveToWaiting` prop (from its props interface),
    the per-row quick-action button that calls it, and the `Hourglass`
    import (confirm nothing else in the file needs it before removing).
  - `src/features/guests/api/guestsApi.ts`: `batchMoveToWaitingList` and
    its `WaitingListEntry` interface.
- **The three providers built in sub-project 2b**, now orphaned:
  `SuppliersProvider`/`PaymentsProvider` (`src/features/budget/context/`)
  and `WaitingListProvider` (`src/features/waitingList/context/`), their
  mount points (`AdminLayout.tsx`'s provider nesting reverts to just
  `GuestsProvider`/`InvitesProvider`), and both feature folders in full —
  `src/features/budget/` and `src/features/waitingList/` (types + context
  files), since nothing else references either folder.

### Explicitly not touched

- **`firestore.rules`** and the actual `suppliers`/`payments`/
  `waiting_list`/`settings` Firestore collections/documents. The app-side
  code goes away; the rules and any existing data stay as they are —
  orphaned but harmless, since nothing in the app can reach them without
  the removed UI.
- **`AdminDashboard`, `AdminTables`, `AdminSettings`** — no cross-references
  to any removed page/provider were found in these files; they are
  unaffected.
- **`GuestsProvider`/`InvitesProvider`** — unaffected; `AdminGuests`/
  `AdminInvites` keep working exactly as they do today, minus the one
  removed bulk action.
- **The `table_order` field** added to the shared `Guest` type in
  sub-project 2b — unrelated to waiting-list removal (used by
  `AdminTables`' drag-and-drop), stays.

## Verification

Same bar as every prior sub-project: `npx tsc --noEmit` + `npm run build`
both pass clean. Additionally, a grep sweep across `src/` for every removed
symbol name, file path, and route string (`AdminBudget`, `AdminReports`,
`AdminWaitingList`, `batchMoveToWaitingList`, `WaitingListEntry`,
`onMoveToWaiting`, `SuppliersProvider`, `PaymentsProvider`,
`WaitingListProvider`, `features/budget`, `features/waitingList`,
`'waiting-list'`, `'budget'`, `'reports'` as route paths) must return zero
hits, confirming nothing was left half-removed. No test runner — manual
verification only, consistent with the whole overhaul.

## Success Criteria

- The admin nav shows exactly 5 items: Dashboard, Invitations, Guest List,
  Tables, Settings.
- Visiting `/admin/waiting-list`, `/admin/budget`, or `/admin/reports`
  directly has no route to match (falls through to the app's normal
  not-found/redirect behavior — same as any other undefined admin path).
- The Guest List page's bulk-action bar and per-row quick actions no
  longer offer "Move to Waiting List" anywhere.
- `npx tsc --noEmit` and `npm run build` both pass clean, and the grep
  sweep above returns zero hits.
