# RSVP Portal Performance & Data-Layer Foundation — Design

Status: Approved (pending spec review)
Date: 2026-07-31
Sub-project 1 of 3 (RSVP portal performance → admin data layer → admin UI/UX overhaul)

## Context

This is the first of three sub-projects decomposed from a broader "modernize the
wedding website" request, which bundled RSVP performance, a backend data layer,
and a full admin UI/UX overhaul into one ask. Those are independent enough in
scope and risk to warrant separate spec → plan → implementation cycles. This
document covers only the public-facing side: the full guest landing page
(hero → venue → dress code → program → gifts → FAQ → RSVP form), since a guest's
actual experience of "the RSVP portal" is the whole page load, not just the
form component.

### Diagnosed root causes (from direct codebase inspection)

1. **Zero code-splitting.** `App.tsx` statically imports all 8 admin pages and
   `LandingPage`. A guest opening the RSVP link downloads `xlsx`, `exceljs`,
   `@dnd-kit/*`, `recharts`, `react-day-picker`, `cmdk`, and every admin page's
   code, none of which they need.
2. **Waterfall fetches.** `RSVPSection.tsx` awaits `deadline` → `invite` →
   `guests` sequentially even though deadline and invite have no dependency on
   each other.
3. **Redundant fetch.** `RSVPSection.tsx` and `FAQSection.tsx` independently
   fetch the same `settings/rsvp_deadline` document — two network reads of one
   doc per page load.
4. **N sequential writes on submit.** `RSVPSection.tsx`'s `handleSubmit` loops
   `await updateDoc` per changed guest instead of one `writeBatch`.
5. **~35MB of dead code/assets.** `DecorationLayer.tsx`'s `<Decoration>`
   component unconditionally `return null`s; the orchid/petal SVGs it
   references (`orchid-purple.svg` 7.2MB, `orchid-white.svg` 7.4MB,
   `petal-white.svg` 10MB, `paper-bg.svg` 7.1MB, `orchid-pink-2.svg` 1.2MB) are
   referenced nowhere else and ship dead weight to `/public`/`dist`.
6. **Oversized images.** `men-attire.svg` (2.7MB) / `women-attire.svg` (4.5MB)
   render at 160px display width with no lazy-loading or size optimization.
   `map-data.svg` (998KB) inside a collapsed FAQ accordion item has no
   `loading="lazy"` and is fetched unconditionally on page load.
7. **Render-blocking fonts.** `index.css` loads 5 Google Font families via CSS
   `@import` (discovered only after the main stylesheet parses) plus the full
   `@fontsource-variable/geist` package, likely including unused weights.
8. **Debug leftover on every load.** `firebase.ts`'s unconditional
   `testConnection()` fires an extra Firestore read for every guest, with no
   product value.
9. **No error boundary.** A render error anywhere in the tree white-screens
   the whole page with no recovery path.
10. **Single spinner, no skeleton.** `RSVPSection`'s loading state is one
    centered spinner rather than a layout-matched skeleton, causing avoidable
    layout shift when real content swaps in.

### Explicitly out of scope for this sub-project

- **Dietary preference capture** — no such field exists in the current data
  model; adding one is a data-model + admin-reporting change, deferred to the
  admin overhaul sub-project. This pass stays performance-only, no new fields.
- **Admin pages** — their internals aren't touched, only wrapped in
  `React.lazy()` at the route level (necessary to keep their bundle out of the
  guest's initial download).
- **Full directory restructure** — no existing files are moved/renamed in this
  pass (see Approach, below).
- **Automated/unit testing** — verified manually (Lighthouse before/after);
  no test runner exists in this repo today and introducing one is out of
  scope unless a specific need arises during implementation.

## Approach

**Hybrid — new service layer, existing files stay put.** Introduce
`lib/queryClient.ts` + `features/rsvp/` (types, api, hooks) as new, additive
modules. Existing components (`RSVPSection.tsx`, `FAQSection.tsx`) are updated
to import data access from these new hooks instead of calling Firestore
directly — but the components themselves are not relocated.

Rejected alternatives:
- **In-place file-by-file fixes** (patch each component directly, no shared
  hooks module): faster/smaller diff, but doesn't structurally fix the
  `rsvp_deadline` double-fetch, and leaves no reusable pattern for the admin
  sub-projects.
- **Full restructure now** (move everything into `features/` immediately):
  cleanest end-state, but mixes reorg risk into a pass whose goal is
  performance, with a much larger diff than necessary.

## Design

### 1. Architecture & New Modules

```
src/
  lib/
    queryClient.ts          # TanStack Query client: staleTime/retry defaults
  features/
    rsvp/
      types.ts               # Guest, Invite, RsvpDeadline — single source of
                              #   truth (currently redefined slightly
                              #   differently per-file)
      api/
        rsvpApi.ts            # fetchInvite, fetchDeadline, submitRsvp — plain
                              #   async functions, no React, independently
                              #   testable/reusable (e.g. by future admin
                              #   RSVP-override features)
      hooks/
        useRsvpInvite.ts       # useQuery wrapper around fetchInvite/fetchDeadline
        useSubmitRsvp.ts        # useMutation wrapper around submitRsvp
```

`main.tsx` gains a `QueryClientProvider` wrapping `<App>`, alongside the
existing `AuthProvider`. `RSVPSection.tsx` and `FAQSection.tsx` change only in
*how* they source `deadline`/`invite` data — their JSX/rendering logic is
otherwise untouched.

### 2. Data Flow & Caching

**Read path:**
- `useRsvpInvite(inviteId)` fires the deadline and invite queries
  concurrently (no artificial dependency between them). The guest-list query
  only fires once the invite doc resolves, since that dependency is real.
- `FAQSection.tsx` switches to the same `['deadline']` query key — TanStack
  Query's cache dedupes it automatically, fixing the redundant-fetch bug.
- `staleTime` generous on `['deadline']` (changes rarely), shorter on
  `['invite', inviteId]` (RSVP status should feel current).
- Revisiting the page within `staleTime` serves cached data instantly and
  revalidates in the background (stale-while-revalidate) instead of a full
  spinner-blocked reload.

**Write path:**
- `useSubmitRsvp` wraps a single `writeBatch` covering every changed guest —
  one round trip regardless of family size, replacing the current per-guest
  sequential `updateDoc` loop.
- Optimistic completion: submit flips to the "completed" state immediately;
  on failure it rolls back with a toast. Toggle buttons remain local state,
  unchanged.

### 3. Bundle, Assets & Rendering

**Code splitting:**
- All `/admin/*` routes + `AdminLayout` → `React.lazy()` in `App.tsx`.
  `LandingPage` stays eager (it's the entry route).
- `vite.config.ts` gets `manualChunks` splitting `firebase` and
  `motion`/`framer-motion` into their own vendor chunks.

**Dead code removal:**
- Delete `DecorationLayer.tsx`'s inert internals and the 5 orphaned SVGs
  (~35MB) from `/public`. No visual diff — they currently render nothing.
  `SectionDecors.*` call sites removed from each section.
- Delete the unconditional `testConnection()` call in `firebase.ts`.

**Images:**
- Re-export `men-attire.svg` / `women-attire.svg` as properly sized WebP.
  Exact conversion approach TBD at plan time pending inspection of what's
  actually inside those SVG files (likely embedded raster data given their
  size).
- `map-data.svg` gets `loading="lazy"` and/or deferred rendering until its
  FAQ accordion item is opened at least once.

**Fonts:**
- Move Google Fonts from `index.css`'s `@import` to `<link rel="preconnect">`
  + `<link rel="stylesheet">` in `index.html`.
- Trim requested weights to what's actually used per family (determined by
  grep at plan time, not guessed here).

**Rendering / CLS / skeletons:**
- `RSVPSection`'s loading spinner becomes a layout-matched skeleton (guest
  rows, button pair) to reduce shift when real content swaps in.
- Existing `aspect-[3/4]` CLS-prevention pattern on image containers is kept
  and applied consistently to any new/changed images.
- No memoization changes in this sub-project — the public landing page has no
  large lists or per-keystroke recompute (unlike the admin pages, which are
  sub-project 2's job).

### 4. Error Handling & Testing

- Root `<ErrorBoundary>` added around `<Routes>` in `App.tsx`.
- `useRsvpInvite`/`useSubmitRsvp` surface errors through TanStack Query's
  built-in error state. Existing `handleFirestoreError` logging (auth/path
  context) is preserved, called from inside `rsvpApi.ts`, but no longer
  responsible for control flow.
- Submit failure behavior unchanged from the user's perspective (toast, stay
  on form) but driven by the mutation's `onError`.
- **Verification: manual only.** Lighthouse mobile run before/after on the
  landing page (bundle size, LCP, CLS, TBT) as the concrete metric. No test
  runner introduced; no unit tests written for this sub-project.

## Success Criteria

- Guest-facing bundle no longer includes admin-only dependencies
  (`xlsx`, `exceljs`, `@dnd-kit/*`, `recharts`, `react-day-picker`, `cmdk`) or
  admin page code.
- RSVP page fetches deadline+invite concurrently, not sequentially; the
  `rsvp_deadline` document is fetched once per page load, not twice.
- RSVP submit is a single batched write regardless of party size.
- `/public` no longer contains the 5 orphaned decoration SVGs (~35MB removed).
- Dress-code and FAQ-map images are appropriately sized/lazy-loaded.
- Fonts load via `<link>`, not CSS `@import`.
- Lighthouse mobile score (bundle size, LCP, CLS, TBT) measurably improves
  over the pre-change baseline.

## Results

Verification performed 2026-07-31 (Task 15), after Tasks 1–14 were implemented
and reviewed. Environment note: no browser-automation tool is available in
this execution environment, so Lighthouse (Step 4 of the task brief) and the
interactive/visual portion of the manual walkthrough (Step 5) could **not**
be run here — see "Not verified" below.

### Bundle size — guest-facing entry chunk

`npm run build` output, entry chunk identified as the one `dist/index.html`'s
`<script type="module" src="...">` points at:

| | Before (documented baseline) | After (this build) | Change |
|---|---|---|---|
| Entry chunk (raw) | 3,120.79 kB | 347.43 kB (`index-CZxlQrk_.js`) | **−88.9%** (−2,773.36 kB) |
| Entry chunk (gzip) | 904.52 kB | 110.07 kB | **−87.8%** (−794.45 kB) |
| CSS (raw) | 101.91 kB | 99.93 kB (`index-H53Nt0qK.css`) | −1.9% |
| CSS (gzip) | 16.75 kB | 16.30 kB | −2.7% |

The single 3.1MB monolithic chunk from before this sub-project is gone. The
production build now emits ~30 separate chunks; `xlsx`/`exceljs`/`@dnd-kit`/
`recharts`/`react-day-picker`/`cmdk` and all 8 admin pages are isolated into
lazy chunks (`AdminGuests-*.js` 978.21 kB, `AdminReports-*.js` 420.84 kB,
`command-*.js` 544.09 kB, etc.) that are not requested until `/admin` is
visited — confirmed by `dist/index.html` only referencing the entry chunk,
`motion-*.js`, and `firebase-*.js` via `modulepreload`.

For completeness, total JS actually preloaded for a guest hitting `/` (entry +
modulepreloaded `motion` + `firebase` vendor chunks) is ~905.6 kB raw /
~251.25 kB gzip — still a ~71% raw / ~72% gzip reduction versus the old single
3,120.79 kB / 904.52 kB chunk, even counting those eagerly-preloaded vendor
chunks.

### Dead asset cleanup

`ls public/*.svg` → only `favicon.svg` (633 B) and `map-data.svg` (998,282 B)
remain. The orchid/petal/paper-bg decoration SVGs and the oversized
men-attire/women-attire SVGs (~35MB total) confirmed deleted.

### Full-codebase sanity checks

- `npx tsc --noEmit` — **passed, zero errors** (whole repo, not just this
  task's files).
- `npm run lint` (`eslint . --report-unused-disable-directives
  --max-warnings 0`) — **passed, zero warnings/errors** (whole repo).
- `npm run dev` boots cleanly (Vite ready in 713ms). `curl` against
  `http://localhost:3000/` returns HTTP 200 with the expected HTML shell;
  `/src/main.tsx` (entry module) returns HTTP 200; `/admin` route resolves
  HTTP 200 (served via Vite's SPA fallback). No server-side errors in the dev
  server log during these requests.

### Not verified (requires a human with a browser)

This environment has no browser-automation tool, so the following from the
task brief were **not** performed and must be done by a human before this
sub-project is treated as fully verified in production:

- **Step 4, Lighthouse mobile run** against `/?inviteUrl=<invite-id>` via
  Chrome DevTools — no Performance score, LCP, CLS, or Total Blocking Time
  numbers were captured. None are fabricated here.
- **Step 5, interactive/visual walkthrough** — scrolling every landing-page
  section, opening a real RSVP link, toggling guest statuses, submitting, and
  confirming no visual regressions/console errors/broken images. Only static
  verification (dev server boot, HTTP 200 on `/` and `/admin`, `tsc`/`lint`
  clean) was possible here; actual rendering, images, and JS console were not
  inspected.

**Recommendation:** before marking this sub-project done in production, a
human should run `npm run preview`, open it in Chrome, do the full guest
walkthrough described in Step 5, and run a Lighthouse mobile report to
capture the first real Performance/LCP/CLS/TBT numbers as the new baseline
going forward.
