# Admin Guests & Invites Data Layer — Design

Status: Approved (pending spec review)
Date: 2026-07-31
Sub-project 2a of 3 (RSVP portal performance [done] → **admin data layer** →
admin UI/UX overhaul), itself split into 2a (Guests + Invites, this doc) and
2b (Budget/Reports/Tables/WaitingList/Dashboard, fast-follow).

## Context

Sub-project 1 (RSVP portal performance) is complete and merged locally
(kept on `overhaul-website`, not yet merged to `main`). This is the first
half of sub-project 2: fixing the admin data layer's root causes, scoped to
`AdminGuests.tsx` and `AdminInvites.tsx` — the two largest, most duplicated,
and highest-risk admin pages. The remaining five admin pages
(`AdminBudget`, `AdminReports`, `AdminTables`, `AdminWaitingList`,
`AdminDashboard`) have smaller, more isolated versions of the same problems
and are deferred to sub-project 2b.

### Diagnosed root causes (re-surveyed directly against current code)

1. **Duplicated real-time listeners.** `guests` is independently
   `onSnapshot`'d by 5 pages (`AdminGuests.tsx:167`, `AdminInvites.tsx:109`,
   `AdminReports.tsx:54`, `AdminTables.tsx:385`, `AdminWaitingList.tsx:71`);
   `invites` by 2 (`AdminGuests.tsx:163`, `AdminInvites.tsx:104`). Within
   this doc's scope, `AdminGuests.tsx` and `AdminInvites.tsx` each
   independently subscribe to *both* `guests` and `invites` — 4 listeners
   for 2 collections, torn down and recreated on every navigation between
   the two pages since each page owns its own subscription.
2. **Sequential-write loops instead of batches.**
   `AdminGuests.tsx:290-291` (bulk delete), `AdminGuests.tsx:302-303` (bulk
   status update), `AdminGuests.tsx:359-361` (Excel import) each `await` a
   Firestore write per item in a `for` loop. `AdminInvites.tsx:187-189`
   (creating an invite's member guests) and `AdminInvites.tsx:289-290`
   (unassigning guests when an invite is deleted) do the same. Contrast
   with `AdminGuests.tsx`'s existing `handleMoveToWaitingList`, which
   already correctly uses `writeBatch` — the pattern to replicate, not
   invent.
3. **Duplicated `Guest`/`Invite` type definitions.** Slightly different
   shapes exist in `AdminGuests.tsx`, `AdminInvites.tsx`,
   `RSVPSection.tsx`, and `src/features/rsvp/types.ts` (sub-project 1).
4. **Near-zero memoization on large derived-state pipelines.**
   `AdminGuests.tsx` recomputes `guestsWithInviteName → filteredGuests →
   sortedGuests` (map/filter/sort over the full guest list) on every
   render, including every keystroke in its search input — no
   `useMemo`, no debounce. `AdminInvites.tsx` has the analogous problem.
   Neither page's table rows are `React.memo`'d, so any parent state
   change (opening a dialog, an unrelated filter, a keystroke) re-renders
   every visible row.

### Explicitly out of scope for this sub-project

- **`AdminBudget`, `AdminReports`, `AdminTables`, `AdminWaitingList`,
  `AdminDashboard`** — their `onSnapshot` listeners, write patterns, and
  memoization are deferred to sub-project 2b. This doc does not touch
  those files.
- **Full component decomposition.** Add/edit dialogs, filter bars, and
  pagination controls in `AdminGuests.tsx`/`AdminInvites.tsx` stay inline.
  Only `GuestRow`/`InviteRow` are extracted, because `React.memo` requires
  an isolated component to memoize — everything else stays where it is.
  Broader restructuring is sub-project 3's job.
- **Admin UI/UX changes.** No visual redesign, no new workflows — this is
  a data-layer and re-render-performance pass only, matching sub-project
  1's "performance only" discipline.
- **Automated/unit testing.** Same as sub-project 1: manual verification
  only, no test runner introduced.

## Key Decisions (from brainstorming)

- **Scope:** Guests + Invites first; Budget/Reports/Tables/WaitingList/
  Dashboard is a separate follow-up plan (2b).
- **Shared real-time data:** plain React Context wrapping `onSnapshot`
  (`GuestsProvider`/`InvitesProvider` at the `AdminLayout` level), not a
  TanStack-Query bridge — Firestore's push model doesn't map naturally onto
  Query's pull/cache model, and a context provider is simpler and more
  direct for this case.
- **Memoization is in-scope for this same pass** — both files are already
  being substantially edited for the hook migration, so fixing the
  re-render problem in the same edit avoids touching these large files
  twice.
- **Minimal extraction** — only `GuestRow`/`InviteRow` are pulled into
  their own files (required for `React.memo` to be effective at all).
  Dialogs, filters, and pagination remain inline.

## Design

### 1. Architecture & New Modules

```
src/
  hooks/
    useDebounce.ts             # generic debounce hook (search inputs)
  features/
    guests/
      types.ts                  # Guest, GuestRole, TableType — single
                                 #   source of truth
      context/
        GuestsProvider.tsx        # one onSnapshot('guests') shared across
                                   #   all admin pages; exposes
                                   #   { guests, loading }
      api/
        guestsApi.ts             # batchDeleteGuests, batchUpdateGuestStatus,
                                  #   batchImportGuests, batchMoveToWaitingList
                                  #   — chunked at Firestore's 500-op batch
                                  #   limit
    invites/
      types.ts                  # Invite
      context/
        InvitesProvider.tsx        # one onSnapshot('invites')
      api/
        invitesApi.ts             # createInviteWithGuests,
                                   #   deleteInviteAndUnassignGuests
  components/
    admin/
      guests/
        GuestRow.tsx              # React.memo'd table row
      invites/
        InviteRow.tsx              # React.memo'd table row
```

`AdminLayout.tsx` wraps its `<Outlet />` in `<GuestsProvider>` and
`<InvitesProvider>`, so both listeners subscribe once per admin session
(mount of `AdminLayout`) and persist across every nested-route navigation.
`AdminGuests.tsx`/`AdminInvites.tsx` consume them via `useGuests()`/
`useInvites()` instead of running their own `onSnapshot`.

### 2. Data Flow, Batching & Memoization

**Read path:**
- `GuestsProvider`/`InvitesProvider` each hold exactly one live listener,
  created when `AdminLayout` mounts, torn down on unmount/logout — not
  per-page.
- `AdminReports.tsx`, `AdminTables.tsx`, `AdminWaitingList.tsx` keep their
  own listeners for now (sub-project 2b's job).

**Write path:**
- `guestsApi.ts`: `batchDeleteGuests(ids)`, `batchUpdateGuestStatus(ids,
  status)`, `batchImportGuests(rows)`, `batchMoveToWaitingList(ids)` — each
  builds one or more `writeBatch`es chunked at 500 ops. Mirrors the
  existing `handleMoveToWaitingList` pattern already in the codebase.
- `invitesApi.ts`: `createInviteWithGuests(inviteData, guestNames)` (one
  batch: invite doc + all member guest docs) and
  `deleteInviteAndUnassignGuests(inviteId)` (one batch: unassign all member
  guests + delete the invite), replacing the current sequential loops.
- Page event handlers become thin wrappers around these functions; existing
  `toast`/`handleFirestoreError` UI feedback is preserved exactly, only the
  underlying Firestore call changes from a loop to a batch.

**Memoization:**
- `AdminGuests.tsx`: `guestsWithInviteName → filteredGuests → sortedGuests`
  becomes one `useMemo` keyed on `[guests, invites, search, statusFilter,
  roleFilter, tableFilter, sortField, sortDirection]`. The search input is
  debounced 300ms (`useDebounce`) before feeding that memo.
- `AdminInvites.tsx` gets the equivalent treatment for its analogous
  derived-list computation.
- `GuestRow`/`InviteRow` are `React.memo`'d with `useCallback`'d handlers
  passed from the parent, so a row only re-renders when its own props
  change.

### 3. Error Handling & Testing

- All new Firestore calls (in `guestsApi.ts`, `invitesApi.ts`, and the two
  providers' `onSnapshot` error callbacks) route through the existing
  `handleFirestoreError`/`OperationType` pattern. The invites listener
  currently has no error callback at all — centralizing it into
  `InvitesProvider` fixes that as a byproduct.
- Chunked multi-batch operations (>500 docs, not expected at this guest
  list's actual scale) either fully succeed or report exactly which chunk
  failed — no silent partial state.
- **Verification: manual only**, consistent with sub-project 1. Concrete
  checks: repeated navigation between `/admin/guests` and `/admin/invites`
  creates no new `guests`/`invites` listeners (Firestore console/Network
  tab); bulk delete/status-update/import/invite-create/invite-delete each
  fire exactly one batch commit regardless of item count; typing in the
  guest search box no longer visibly stutters with a realistic guest-list
  size.

## Success Criteria

- `AdminGuests.tsx` and `AdminInvites.tsx` no longer call `onSnapshot`
  directly — both consume `useGuests()`/`useInvites()`.
- Navigating between `/admin/guests` and `/admin/invites` does not
  re-subscribe either listener.
- All 5 identified sequential-write sites become single batched writes.
- Search input in both pages is debounced; the filter/sort pipeline is
  memoized; table rows are `React.memo`'d.
- No visual or workflow change — this is a data-layer and performance pass
  only.

## Results

Verification performed 2026-07-31 (Task 12), after Tasks 1–11 were complete,
reviewed, and approved.

**`npx tsc --noEmit` (whole project):** clean, zero errors.

**`npm run build`:** succeeded (`tsc && vite build`, 3350 modules
transformed, `dist/` emitted). Vite emits its standard "chunk larger than
500 kB" advisory for a few bundles (`AdminGuests`, `AdminReports`,
`firebase`, `useDebounce`); this is a pre-existing chunk-size observation,
not a build failure or a regression introduced by this plan.

**`npm run lint`:** ran clean (no output). **This is not meaningful
evidence of code quality.** As discovered during Task 10's review, this
repo's `eslint.config.js` applies its rule set only to `*.rules` (Firebase
security rules) files — it lints no `.ts`/`.tsx` file at all. A clean lint
run has never been real signal anywhere in this plan or in sub-project 1;
it is reported here only because the task asked for the run to be on
record.

**`onSnapshot` removal — confirmed:**
`grep -rn "onSnapshot" src/pages/admin/AdminGuests.tsx
src/pages/admin/AdminInvites.tsx` returns no matches. Both pages now
consume `useGuests()`/`useInvites()` from the shared providers instead of
running their own listeners, satisfying that part of the success criteria
literally.

**Single-subscription behavior across navigation — NOT confirmed; a real
gap was found by code reading.** The intended guarantee (Task 9) is that
`GuestsProvider`/`InvitesProvider` mount once at `AdminLayout`'s `<Outlet
/>` wrap and stay mounted across nested-route navigation, so their
`useEffect`-owned `onSnapshot` listeners subscribe once per admin session.
Reading `src/components/admin/AdminLayout.tsx` (current, post-Task-11)
shows this guarantee does not actually hold:

```tsx
<motion.div
   key={location.pathname}
   ...
>
  <GuestsProvider>
    <InvitesProvider>
      <Outlet />
    </InvitesProvider>
  </GuestsProvider>
</motion.div>
```

The `key={location.pathname}` on the `motion.div` predates this plan
(present since the file's initial commit, for a fade/slide page-transition
effect) and was not moved or accounted for when Task 9 nested the two
providers inside it. Changing a React element's `key` forces React to
unmount the old instance and mount a fresh one for everything under that
element. Since `location.pathname` changes on every admin navigation —
including every `/admin/guests` ↔ `/admin/invites` transition, and any
other admin nav — `GuestsProvider` and `InvitesProvider` are unmounted and
remounted on every route change, not just once per session. Both
providers' `useEffect(() => { const unsubscribe = onSnapshot(...); return
unsubscribe; }, [])` (`src/features/guests/context/GuestsProvider.tsx`,
`src/features/invites/context/InvitesProvider.tsx`) therefore tears down
and recreates its listener on every navigation, exactly the behavior this
sub-project set out to eliminate. It is still a net improvement over the
pre-plan state (2 shared listener types instead of up to 4 independently
duplicated ones, plus the batching/memoization work, which are unaffected
by this issue), but the specific "persists across navigation" success
criterion is not met by the current wiring. This was visible in the diff
reviewed for Task 9 (`key={location.pathname}` appears as unchanged
context in `review-8ab51511..a69dc947.diff`) but was not flagged at the
time. Fixing it (e.g. moving the `key` to a wrapper inside the providers,
scoped to just the animated page content, rather than around them) is a
one-file follow-up, not attempted here per this task's verification-only
scope.

**Sequential-write loops — the two diagnosed `AdminInvites.tsx` sites and
all three diagnosed `AdminGuests.tsx` sites are fixed; one additional,
previously undiagnosed sequential loop remains.** The literal check from
the brief, `grep -n "for (const"
src/pages/admin/AdminGuests.tsx src/pages/admin/AdminInvites.tsx -A2 |
grep -B2 "await "`, returns no output — but that is partly an artifact of
its narrow 2-line context window, not proof the pages are loop-free.
`AdminGuests.tsx` has zero `for (const` loops left (its bulk delete,
status update, and Excel import all now call a single `batchX(...)`
function). `AdminInvites.tsx` still has one: its bulk Excel-import handler
(`onDrop`, around line 142) does
```tsx
for (const row of rows) {
  ...
  await createInviteWithGuests(inviteId, { name, import_order: rowIndex++ }, guestNames, row.role || null);
}
```
— one sequential `await` per imported invite row. This is an improvement
over the pre-plan code (which had a *nested* loop, one `addDoc` per guest
per invite — the specific site named in the original diagnosis,
`AdminInvites.tsx:187-189`, "creating an invite's member guests," and now
fixed by routing through `createInviteWithGuests`'s internal chunked
batch), but the outer loop over invite *rows* during a multi-invite bulk
import was not one of the five originally diagnosed sites and remains
sequential — one network round trip per invite being imported, rather than
one batch for the whole file. `invitesApi.ts` currently only exposes a
single-invite `createInviteWithGuests`; there is no bulk/multi-invite
equivalent of `guestsApi.ts`'s `batchImportGuests`. At realistic wedding
guest-list scale (tens of invites) this is a minor latency issue, not a
correctness bug, but it is a genuine gap against the "all 5 identified
sequential-write sites become single batched writes" success criterion
being read as "no sequential Firestore write loops remain in these two
files."

**Not verified (no browser available in this environment):** live
navigation click-through, bulk delete/status-update/import on
`/admin/guests`, invite create/delete with guest assignment on
`/admin/invites`, and whether the guest search box feels smooth while
typing. A human should perform this walkthrough — including watching the
Firestore usage dashboard or Network tab while clicking `/admin/guests` →
`/admin/invites` → `/admin/guests` a few times in a row to see whether new
listener connections open each time, given the `key={location.pathname}`
finding above — before treating this sub-project as fully verified in
production.
