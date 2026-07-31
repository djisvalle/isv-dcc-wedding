# RSVP Portal Performance & Data-Layer Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the guest-facing landing page (hero → venue → dress code → program → gifts → FAQ → RSVP form) fast and fluid by fixing the diagnosed root causes: no code-splitting, waterfall/duplicate Firestore reads, sequential writes, ~35MB of dead assets, oversized images, and render-blocking fonts.

**Architecture:** Hybrid approach — introduce a new `features/rsvp/` service layer (types, API functions, TanStack Query hooks) that existing components import from; no existing files are relocated. Admin routes become lazy-loaded so their dependencies never reach the guest bundle.

**Tech Stack:** Vite 6, React 18, TypeScript, Firebase Firestore, `@tanstack/react-query` (new), `sharp` (new, dev-only, for a one-off image conversion script).

**Spec:** `docs/superpowers/specs/2026-07-31-rsvp-portal-performance-design.md`

## Global Constraints

- Performance only — no new data fields or functionality (e.g. no dietary-preference field). Source: spec "Explicitly out of scope."
- No existing component files are moved or renamed in this pass. Source: spec "Approach."
- Verification is manual only (production build + browser/Lighthouse checks). No test runner is introduced; no unit tests are written. Source: spec "Explicitly out of scope" + Section 4.
- All Firestore error logging continues to go through the existing `handleFirestoreError`/`OperationType` pattern in `src/lib/firebase.ts` — preserve it, call it from the new `rsvpApi.ts`, don't replace it. Source: spec Section 4.
- `RSVPSection.tsx`'s completed/success-screen JSX and visual RSVP-card JSX are unchanged in this pass except where a step explicitly says otherwise (loading state → skeleton, submit state → mutation-driven). Source: spec Section 3 ("No memoization changes... rendering logic is otherwise untouched").

---

### Task 1: Add TanStack Query and wire the provider

**Files:**
- Modify: `package.json`
- Create: `src/lib/queryClient.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `queryClient` (default export, `QueryClient` instance) from `src/lib/queryClient.ts`, imported by `main.tsx` and available for all later tasks' hooks to use implicitly via `QueryClientProvider` context.

- [ ] **Step 1: Add the dependency**

Edit `package.json`, inside `"dependencies"` (keep alphabetical order — insert after `"@base-ui/react"` and before `"@dnd-kit/core"`):

```json
    "@base-ui/react": "^1.4.1",
    "@tanstack/react-query": "^5.101.4",
    "@dnd-kit/core": "^6.1.0",
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: `package-lock.json` updates, no errors.

- [ ] **Step 3: Create the query client**

Create `src/lib/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 4: Wire the provider**

Modify `src/main.tsx` (full new contents):

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClientProvider} from '@tanstack/react-query';
import App from './App';
import './index.css';
import { AuthProvider } from './lib/AuthContext';
import { queryClient } from './lib/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.
Run: `npm run dev`, open `http://localhost:3000/` in a browser.
Expected: landing page renders exactly as before (no visible change yet — this task only adds infrastructure).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/queryClient.ts src/main.tsx
git commit -m "feat: add TanStack Query provider"
```

---

### Task 2: Create shared RSVP domain types

**Files:**
- Create: `src/features/rsvp/types.ts`

**Interfaces:**
- Produces: `Guest`, `Invite`, `RsvpDeadline` interfaces, imported by Tasks 3, 4, 5.

- [ ] **Step 1: Create the types file**

Create `src/features/rsvp/types.ts`:

```ts
export interface Guest {
  id: string;
  name: string;
  nickname?: string;
  is_coming: boolean | null;
  import_order?: number;
  is_baby_or_child?: boolean;
  parent_name?: string;
}

export interface Invite {
  id: string;
  name: string;
  nickname?: string;
}

export interface RsvpDeadline {
  date: Date | null;
  isPastDeadline: boolean;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (file has no consumers yet, but must type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add src/features/rsvp/types.ts
git commit -m "feat: add shared RSVP domain types"
```

---

### Task 3: Create the RSVP API module

**Files:**
- Create: `src/features/rsvp/api/rsvpApi.ts`

**Interfaces:**
- Consumes: `Guest`, `Invite`, `RsvpDeadline` from `../types` (Task 2). `db`, `OperationType`, `handleFirestoreError` from `@/lib/firebase` (existing).
- Produces: `fetchDeadline(): Promise<RsvpDeadline>`, `fetchInvite(inviteId: string): Promise<InviteWithGuests>` (where `InviteWithGuests = { invite: Invite; guests: Guest[] }`), `submitRsvp(changes: GuestStatusChange[]): Promise<void>` (where `GuestStatusChange = { id: string; is_coming: boolean | null }`). Consumed by Task 4's hooks.

- [ ] **Step 1: Create the API module**

Create `src/features/rsvp/api/rsvpApi.ts`:

```ts
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '@/lib/firebase';
import type { Guest, Invite, RsvpDeadline } from '../types';

export async function fetchDeadline(): Promise<RsvpDeadline> {
  const deadlineRef = doc(db, 'settings', 'rsvp_deadline');
  const snap = await getDoc(deadlineRef).catch(err => {
    handleFirestoreError(err, OperationType.GET, 'settings/rsvp_deadline');
    throw err;
  });

  if (!snap.exists() || !snap.data().value) {
    return { date: null, isPastDeadline: false };
  }

  const date = new Date(snap.data().value);
  return { date, isPastDeadline: date < new Date() };
}

export interface InviteWithGuests {
  invite: Invite;
  guests: Guest[];
}

export async function fetchInvite(inviteId: string): Promise<InviteWithGuests> {
  const inviteRef = doc(db, 'invites', inviteId);
  const inviteSnap = await getDoc(inviteRef).catch(err => {
    handleFirestoreError(err, OperationType.GET, `invites/${inviteId}`);
    throw err;
  });

  if (inviteSnap.exists()) {
    const invite = { id: inviteSnap.id, ...inviteSnap.data() } as Invite;

    const guestsRef = collection(db, 'guests');
    const q = query(guestsRef, where('invite_id', '==', inviteId));
    const guestSnap = await getDocs(q).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'guests (filtered)');
      throw err;
    });

    const guests = guestSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as Guest))
      .sort((a, b) => (a.import_order ?? 0) - (b.import_order ?? 0));

    return { invite, guests };
  }

  // Fallback: inviteId might be an individual guest's own document id
  const guestRef = doc(db, 'guests', inviteId);
  const guestSnap = await getDoc(guestRef).catch(err => {
    handleFirestoreError(err, OperationType.GET, `guests/${inviteId}`);
    throw err;
  });

  if (!guestSnap.exists()) {
    throw new Error('Invite not found');
  }

  const guest = { id: guestSnap.id, ...guestSnap.data() } as Guest;
  const invite: Invite = { id: guest.id, name: guest.name, nickname: guest.nickname };
  return { invite, guests: [guest] };
}

export interface GuestStatusChange {
  id: string;
  is_coming: boolean | null;
}

export async function submitRsvp(changes: GuestStatusChange[]): Promise<void> {
  if (changes.length === 0) return;

  const batch = writeBatch(db);
  for (const change of changes) {
    batch.update(doc(db, 'guests', change.id), {
      is_coming: change.is_coming,
      updated_at: serverTimestamp(),
    });
  }

  await batch.commit().catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, 'guests/multiple');
    throw err;
  });
}
```

This preserves the exact fallback behavior of the original `RSVPSection.tsx` fetch logic (invite-group lookup, then individual-guest-id fallback, then `'Invite not found'` error) and replaces the original per-guest `updateDoc` loop with one `writeBatch`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/rsvp/api/rsvpApi.ts
git commit -m "feat: add RSVP API module with parallel-fetch-ready reads and batched writes"
```

---

### Task 4: Create the RSVP query/mutation hooks

**Files:**
- Create: `src/features/rsvp/hooks/useRsvpInvite.ts`
- Create: `src/features/rsvp/hooks/useSubmitRsvp.ts`

**Interfaces:**
- Consumes: `fetchDeadline`, `fetchInvite`, `submitRsvp`, `GuestStatusChange` from `../api/rsvpApi` (Task 3).
- Produces: `useDeadline()` (returns a TanStack Query `UseQueryResult<RsvpDeadline>`), `useRsvpInvite(inviteId: string | undefined)` (returns `{ invite, guests, deadline, isPastDeadline, loading, error }`), `useSubmitRsvp(inviteId: string | undefined)` (returns a TanStack `UseMutationResult` with `mutateAsync(changes: GuestStatusChange[])`). Consumed by Task 5 (`useDeadline`, `useRsvpInvite`, `useSubmitRsvp`), Task 6 (`useDeadline`).

- [ ] **Step 1: Create the read hooks**

Create `src/features/rsvp/hooks/useRsvpInvite.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchDeadline, fetchInvite } from '../api/rsvpApi';

export function useDeadline() {
  return useQuery({
    queryKey: ['deadline'],
    queryFn: fetchDeadline,
    staleTime: 5 * 60 * 1000, // deadline changes rarely
  });
}

export function useRsvpInvite(inviteId: string | undefined) {
  const deadlineQuery = useDeadline();

  const inviteQuery = useQuery({
    queryKey: ['invite', inviteId],
    queryFn: () => fetchInvite(inviteId as string),
    enabled: !!inviteId,
    staleTime: 30 * 1000, // RSVP status should feel current
  });

  return {
    invite: inviteQuery.data?.invite ?? null,
    guests: inviteQuery.data?.guests ?? [],
    deadline: deadlineQuery.data?.date ?? null,
    isPastDeadline: deadlineQuery.data?.isPastDeadline ?? false,
    loading: inviteQuery.isLoading || deadlineQuery.isLoading,
    error: inviteQuery.error ?? deadlineQuery.error,
  };
}
```

`useDeadline` and `useRsvpInvite`'s internal `deadlineQuery` share the exact query key `['deadline']`, so TanStack Query dedupes them into a single network read whenever both are mounted on the same page (RSVPSection + FAQSection). The invite query and deadline query fire concurrently since they're independent `useQuery` calls with no dependency between them — the guest-list fetch (inside `fetchInvite`) only runs after the invite doc resolves, which is a real dependency.

- [ ] **Step 2: Create the write hook**

Create `src/features/rsvp/hooks/useSubmitRsvp.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitRsvp, type GuestStatusChange } from '../api/rsvpApi';

export function useSubmitRsvp(inviteId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: GuestStatusChange[]) => submitRsvp(changes),
    onSuccess: () => {
      if (inviteId) {
        queryClient.invalidateQueries({ queryKey: ['invite', inviteId] });
      }
    },
  });
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/rsvp/hooks/useRsvpInvite.ts src/features/rsvp/hooks/useSubmitRsvp.ts
git commit -m "feat: add RSVP query and mutation hooks"
```

---

### Task 5: Add an RSVP loading skeleton and rewire RSVPSection onto TanStack Query

**Files:**
- Create: `src/components/shared/RsvpSkeleton.tsx`
- Modify: `src/components/shared/RSVPSection.tsx` (full rewrite of data-fetching and submit-handling; touches the whole file)

**Interfaces:**
- Consumes: `useRsvpInvite` from `@/features/rsvp/hooks/useRsvpInvite`, `useSubmitRsvp` from `@/features/rsvp/hooks/useSubmitRsvp` (both Task 4), `Guest` from `@/features/rsvp/types` (Task 2).
- Produces: `RsvpSkeleton` (default export) — a layout-matched loading placeholder, sized to approximate the real RSVP card to minimize CLS when it's replaced by real content.

This task rewires both the read path (invite/guest/deadline fetch) and the write path (batched submit) in one pass, so every commit in this task leaves the file in a compiling, working state — the read and write rewires are too entangled in this one file (the submit handler reads `guests`/`serverGuests` state the read-path rewire introduces, and the JSX further down references the mutation's pending state) to split into separately-committed sub-steps without an intermediate broken build.

- [ ] **Step 1: Create the skeleton component**

Create `src/components/shared/RsvpSkeleton.tsx`:

```tsx
export default function RsvpSkeleton() {
  return (
    <div className="py-12 md:py-20 px-6 md:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-[2.5rem] bg-white/60 shadow-xl overflow-hidden animate-pulse">
          <div className="py-10 md:py-16 px-8 md:px-12 bg-wedding-gold/5 text-center space-y-4">
            <div className="h-3 w-40 bg-wedding-gold/10 rounded-full mx-auto" />
            <div className="h-10 w-64 bg-wedding-gold/10 rounded-full mx-auto" />
            <div className="h-4 w-72 bg-wedding-gold/10 rounded-full mx-auto" />
          </div>
          <div className="p-8 md:p-14 space-y-6">
            {[0, 1].map(i => (
              <div
                key={i}
                className="p-6 md:p-8 border border-wedding-gold/5 rounded-3xl bg-white/40 flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="h-6 w-32 bg-wedding-gold/10 rounded-full" />
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="h-11 flex-1 md:w-24 bg-wedding-gold/10 rounded-full" />
                  <div className="h-11 flex-1 md:w-24 bg-wedding-gold/10 rounded-full" />
                </div>
              </div>
            ))}
            <div className="h-16 w-full bg-wedding-dark/10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewire RSVPSection.tsx's imports and data source**

Modify `src/components/shared/RSVPSection.tsx`. Replace lines 1–170 (everything from the top imports through the closing of the `loading` early-return block) with:

```tsx
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Heart } from 'lucide-react';
import { useRsvpInvite } from '@/features/rsvp/hooks/useRsvpInvite';
import { useSubmitRsvp } from '@/features/rsvp/hooks/useSubmitRsvp';
import type { Guest } from '@/features/rsvp/types';
import RsvpSkeleton from './RsvpSkeleton';

interface RSVPSectionProps {
  inviteId: string;
}

export default function RSVPSection({ inviteId }: RSVPSectionProps) {
  const { invite, guests: serverGuests, isPastDeadline, loading, error } = useRsvpInvite(inviteId);
  const submitMutation = useSubmitRsvp(inviteId);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setGuests(serverGuests);
  }, [serverGuests]);

  useEffect(() => {
    if (error) {
      console.error('RSVP fetch error:', error);
      toast.error('Could not find your invitation. Please check the link.');
    }
  }, [error]);

  const handleToggleGuest = (id: string, val: boolean) => {
    setGuests(prev => prev.map(g => (g.id === id ? { ...g, is_coming: val } : g)));
  };

  const handleSubmit = async () => {
    const changedGuests = guests
      .filter(guest => {
        const initial = serverGuests.find(sg => sg.id === guest.id);
        return initial && initial.is_coming !== guest.is_coming;
      })
      .map(g => ({ id: g.id, is_coming: g.is_coming }));

    if (changedGuests.length === 0) {
      toast.info('No changes to save.');
      setCompleted(true);
      return;
    }

    try {
      await submitMutation.mutateAsync(changedGuests);
      toast.success('Thank you! Your RSVP has been saved.');
      setCompleted(true);
    } catch {
      toast.error('Failed to save RSVP. Please try again.');
    }
  };

  if (loading) {
    return <RsvpSkeleton />;
  }

  if (!invite) return null;
```

Everything from the original `if (completed) { ... }` block onward (originally starting at line 172) stays **unchanged** for now — do not modify the completed-screen JSX or the main return JSX below it yet; Step 3 makes the two substitutions it needs.

Note: the `Loader2` icon import is kept even though the old centered-spinner block is removed, because it's still used inside the submit button's pending state, updated next.

- [ ] **Step 3: Replace the `submitting` references further down in the same file**

The removed `submitting` state is still referenced twice below the code Step 2 replaced. Find the `disabled` prop on the submit `<Button>`:

```tsx
disabled={submitting || guests.every(g => g.is_coming === null)}
```

Replace with:

```tsx
disabled={submitMutation.isPending || guests.every(g => g.is_coming === null)}
```

Then find the spinner conditional:

```tsx
{submitting ? (
  <div className="flex items-center gap-3">
    <Loader2 className="animate-spin w-5 h-5" />
    <span>Confirming...</span>
  </div>
) : "Confirm RSVP"}
```

Replace with:

```tsx
{submitMutation.isPending ? (
  <div className="flex items-center gap-3">
    <Loader2 className="animate-spin w-5 h-5" />
    <span>Confirming...</span>
  </div>
) : "Confirm RSVP"}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the file.

Run: `npm run dev`, then in a browser open an RSVP link for a test invite with 2+ guests (use an existing `invite_id`/guest doc id from the Firestore console, or ask the project owner for a live test link).
Expected: page loads (skeleton flashes briefly, then real card), toggling Attending/Not Attending updates instantly, clicking "Confirm RSVP" shows the spinner briefly then the success screen. Open the browser's Network tab before clicking Confirm and confirm exactly **one** Firestore `Commit`/write request fires on submit, regardless of how many guests were toggled (compare to the old behavior of one request per changed guest).

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/RsvpSkeleton.tsx src/components/shared/RSVPSection.tsx
git commit -m "feat: rewire RSVPSection onto TanStack Query, batch submit, add skeleton loader"
```

---

### Task 6: Rewire FAQSection onto the shared deadline query

**Files:**
- Modify: `src/components/shared/FAQSection.tsx`

**Interfaces:**
- Consumes: `useDeadline` from `@/features/rsvp/hooks/useRsvpInvite` (Task 4).

- [ ] **Step 1: Replace the manual fetch with the shared hook**

In `src/components/shared/FAQSection.tsx`, replace the import block (lines 1–7):

```tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SectionDecors } from './DecorationLayer';
```

with:

```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeadline } from '@/features/rsvp/hooks/useRsvpInvite';
```

(The `SectionDecors` import is removed here since Task 11 deletes that module entirely — removing it now avoids a dangling import in the interim. `useEffect` is dropped since the manual fetch effect goes away in this step.)

- [ ] **Step 2: Replace the deadline state/effect**

Find the start of the component:

```tsx
export default function FAQSection() {
  const [deadlineDate, setDeadlineDate] = useState<string>('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        const docRef = doc(db, 'settings', 'rsvp_deadline');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const val = snap.data().value;
          if (val) {
            const date = new Date(val);
            setDeadlineDate(date.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch deadline:', err);
      }
    };
    fetchDeadline();
  }, []);
```

Replace with:

```tsx
export default function FAQSection() {
  const { data: deadline } = useDeadline();
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const deadlineDate = deadline?.date
    ? deadline.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
```

- [ ] **Step 3: Remove the `<SectionDecors.FAQ />` call site**

Find (originally around line 121, now shifted up slightly after Steps 1–2):

```tsx
      <SectionDecors.FAQ />
```

Delete this line. It's the JSX line immediately after `<section ... id="faq-section">`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, open the landing page, scroll to FAQ, expand "What is the RSVP deadline?".
Expected: same deadline text as before (or the generic fallback text if no deadline is set in Firestore). Open Network tab, reload the page: confirm there is exactly **one** request reading `settings/rsvp_deadline`, not two (compare to before this task, where RSVPSection and FAQSection each fetched it independently).

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/FAQSection.tsx
git commit -m "fix: dedupe rsvp_deadline fetch by sharing the deadline query with RSVPSection"
```

---

### Task 7: Add a root error boundary

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `ErrorBoundary` (named export), a class component wrapping `children`.

- [ ] **Step 1: Create the error boundary**

Create `src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-wedding-cream">
          <p className="font-serif text-2xl text-wedding-dark">Something went wrong.</p>
          <p className="text-sm text-wedding-dark/60 max-w-sm">
            Please try reloading the page. If the problem continues, contact us directly.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-2 px-6 py-3 rounded-full bg-wedding-dark text-white text-sm font-sans tracking-wide"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Wire it into App.tsx**

Modify `src/App.tsx`. Add the import near the top (after the `Toaster` import):

```tsx
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
```

Wrap the returned JSX's `<BrowserRouter>` with `<ErrorBoundary>`. Change:

```tsx
  return (
    <BrowserRouter>
      <Routes>
```

to:

```tsx
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
```

and change the closing tags at the end of the function from:

```tsx
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
```

to:

```tsx
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

(Re-indent the lines between `<Routes>` and `</Routes>` by two spaces to match — a straightforward wrap, no logic changes.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run dev`, confirm the landing page and `/admin/login` both still load normally.

- [ ] **Step 4: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/App.tsx
git commit -m "feat: add root error boundary"
```

---

### Task 8: Lazy-load admin routes

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- None external — this task only changes how existing admin page modules are loaded, not their contents.

- [ ] **Step 1: Convert admin imports to lazy and add Suspense**

Modify `src/App.tsx`. Replace the full import block and add a fallback component and `Suspense` wrapper. New full file contents:

```tsx
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LandingPage from '@/pages/LandingPage';

const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminInvites = lazy(() => import('@/pages/admin/AdminInvites'));
const AdminGuests = lazy(() => import('@/pages/admin/AdminGuests'));
const AdminTables = lazy(() => import('@/pages/admin/AdminTables'));
const AdminBudget = lazy(() => import('@/pages/admin/AdminBudget'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminWaitingList = lazy(() => import('@/pages/admin/AdminWaitingList'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));

function RSVPRedirect() {
  const { inviteId } = useParams();
  const search = window.location.search;

  // If search already contains ? prefix, replace it with & to append to inviteUrl
  const cleanSearch = search ? search.replace(/^\?/, '&') : '';

  return <Navigate to={`/?inviteUrl=${inviteId}${cleanSearch}`} replace />;
}

function AdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<AdminFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/rsvp/:inviteId" element={<RSVPRedirect />} />
            <Route path="/rsvp/:inviteId/" element={<RSVPRedirect />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="invites" element={<AdminInvites />} />
              <Route path="guests" element={<AdminGuests />} />
              <Route path="tables" element={<AdminTables />} />
              <Route path="waiting-list" element={<AdminWaitingList />} />
              <Route path="budget" element={<AdminBudget />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

Note `LandingPage` stays a static (non-lazy) import — it's the entry route, so lazy-loading it would only add a waterfall with no benefit.

- [ ] **Step 2: Verify each admin page has a default export**

Run: `grep -L "^export default" src/pages/admin/*.tsx src/components/admin/AdminLayout.tsx`
Expected: no output (empty result means every file has a default export, which `lazy()` requires).

- [ ] **Step 3: Verify build and behavior**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds, and the output now lists multiple JS chunks under `dist/assets/` (one per lazy-loaded admin page) instead of a single monolithic entry chunk.

Run: `npm run dev`, open the landing page, open the browser Network tab filtered to JS, then navigate to `/admin/login` and log in.
Expected: on the initial landing-page load, no chunk containing `xlsx`, `exceljs`, `dnd-kit`, or `recharts` loads. A new chunk loads only after navigating into `/admin`.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "perf: lazy-load admin routes to keep admin dependencies out of the guest bundle"
```

---

### Task 9: Split vendor chunks in the Vite build

**Files:**
- Modify: `vite.config.ts`

**Interfaces:**
- None external — build configuration only.

- [ ] **Step 1: Add manualChunks**

Modify `vite.config.ts`. Replace the `export default defineConfig({...})` call's contents to add a `build` key:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Finalized Vite 6 configuration for Cloudflare compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          motion: ['motion', 'framer-motion'],
        },
      },
    },
  },
});
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds. Run `ls dist/assets/*.js` (or `dir` on Windows) — confirm chunk files named with a `firebase` and a `motion` prefix now exist alongside the app chunks.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "perf: split firebase and motion into dedicated vendor chunks"
```

---

### Task 10: Remove the debug connection-test call

**Files:**
- Modify: `src/lib/firebase.ts`

**Interfaces:**
- None external.

- [ ] **Step 1: Remove the dead import and the test call**

Modify `src/lib/firebase.ts`. Change line 3 from:

```ts
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
```

to:

```ts
import { getFirestore } from 'firebase/firestore';
```

Then delete lines 57–66 (the `testConnection` function definition and its call):

```ts
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
```

The file should end at the closing brace of `handleFirestoreError` (originally line 55).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, open the landing page, open Network tab, reload.
Expected: no request reading `test/connection` fires (compare to before, where this fired unconditionally on every page load).

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "chore: remove debug connection-test read from every page load"
```

---

### Task 11: Delete the dead decoration system and orphaned SVGs

**Files:**
- Delete: `src/components/shared/DecorationLayer.tsx`
- Delete: `public/orchid-purple.svg`, `public/orchid-white.svg`, `public/orchid-pink-2.svg`, `public/petal-pink.svg`, `public/petal-white.svg`, `public/paper-bg.svg`
- Modify: `src/components/shared/VenueSection.tsx`
- Modify: `src/components/shared/DressCodeSection.tsx`
- Modify: `src/components/shared/ProgramSection.tsx`
- Modify: `src/components/shared/GiftsSection.tsx`
- Modify: `src/components/shared/RSVPSection.tsx`
- Modify: `src/pages/LandingPage.tsx`

(`FAQSection.tsx` already had its `SectionDecors` import and call site removed in Task 6 — no change needed there.)

**Interfaces:**
- None external — pure deletion of dead code with no behavior change (the component being removed already renders nothing).

- [ ] **Step 1: Delete the component file**

Run: `git rm src/components/shared/DecorationLayer.tsx`

- [ ] **Step 2: Delete the orphaned assets**

Run:
```bash
git rm "public/orchid-purple.svg" "public/orchid-white.svg" "public/orchid-pink-2.svg" "public/petal-pink.svg" "public/petal-white.svg" "public/paper-bg.svg"
```

- [ ] **Step 3: Remove each remaining call site and import**

In `src/components/shared/VenueSection.tsx`: delete line 3 (`import { SectionDecors } from './DecorationLayer';`) and line 8 (`<SectionDecors.Venue />`).

In `src/components/shared/DressCodeSection.tsx`: delete line 2 (`import { SectionDecors } from './DecorationLayer';`) and line 7 (`<SectionDecors.DressCode />`).

In `src/components/shared/ProgramSection.tsx`: delete line 2 (`import { SectionDecors } from './DecorationLayer';`) and line 47 (`<SectionDecors.Programme />`).

In `src/components/shared/GiftsSection.tsx`: delete line 2 (`import { SectionDecors } from './DecorationLayer';`) and line 8 (`<SectionDecors.Gifts />`).

In `src/components/shared/RSVPSection.tsx`: delete the import `import { SectionDecors } from './DecorationLayer';` (added back only if still present — Task 5's rewrite of the top of this file already dropped it, since Task 5's replacement import block above does not include it; if `grep -n SectionDecors src/components/shared/RSVPSection.tsx` returns nothing, skip this file) and, if present, delete the `<SectionDecors.RSVP />` JSX line.

In `src/pages/LandingPage.tsx`: delete line 11 (`import { SectionDecors } from '@/components/shared/DecorationLayer';`) and line 33 (`<SectionDecors.Hero />`).

- [ ] **Step 4: Verify no references remain**

Run: `grep -rn "DecorationLayer\|SectionDecors" src/`
Expected: no output.

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, open the landing page.
Expected: page renders identically to before this task (the deleted component always rendered `null`, so there is no visual change).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete dead decoration system and ~35MB of orphaned SVG assets"
```

---

### Task 12: Optimize the dress-code attire images

**Files:**
- Modify: `package.json` (devDependencies)
- Create: `scripts/optimize-images.mjs`
- Create (generated, not hand-written): `public/men-attire.webp`, `public/women-attire.webp`
- Delete: `public/men-attire.svg`, `public/women-attire.svg`
- Modify: `src/components/shared/DressCodeSection.tsx`

**Interfaces:**
- None external.

- [ ] **Step 1: Add sharp as a dev dependency**

Edit `package.json`, inside `"devDependencies"` (alphabetical order — insert after `"react-day-picker"`... actually `devDependencies` doesn't contain that; insert after `"postcss"` and before `"tailwindcss"`):

```json
    "postcss": "^8.4.35",
    "sharp": "^0.35.3",
    "tailwindcss": "^4.2.4",
```

Run: `npm install`
Expected: installs cleanly, no errors.

- [ ] **Step 2: Write the conversion script**

Create `scripts/optimize-images.mjs`:

```js
import sharp from 'sharp';

const conversions = [
  { input: 'public/men-attire.svg', output: 'public/men-attire.webp' },
  { input: 'public/women-attire.svg', output: 'public/women-attire.webp' },
];

for (const { input, output } of conversions) {
  const info = await sharp(input, { density: 300 })
    .resize(320, 427, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}
```

(320x427 matches the display container's `aspect-[3/4]` at roughly 2x the 160px display width, for retina sharpness. `fit: 'cover'` matches the existing `object-cover` CSS on the `<img>`, so the crop behavior is unchanged.)

- [ ] **Step 3: Run the conversion**

Run: `node scripts/optimize-images.mjs`
Expected output similar to:
```
public/men-attire.svg -> public/men-attire.webp (38.8 KB)
public/women-attire.svg -> public/women-attire.webp (XX.X KB)
```
Confirm both output files exist and are each under ~100KB (down from 2.7MB/4.5MB source SVGs — a >95% reduction).

- [ ] **Step 4: Delete the source SVGs**

Run: `git rm public/men-attire.svg public/women-attire.svg`

- [ ] **Step 5: Update DressCodeSection.tsx references**

In `src/components/shared/DressCodeSection.tsx`, change:

```tsx
                <img 
                  src="/men-attire.svg" 
```

to:

```tsx
                <img 
                  src="/men-attire.webp" 
                  loading="lazy"
                  decoding="async"
```

and change:

```tsx
                <img 
                  src="/women-attire.svg" 
```

to:

```tsx
                <img 
                  src="/women-attire.webp" 
                  loading="lazy"
                  decoding="async"
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, open the landing page, scroll to the Dress Code section.
Expected: both attire images render correctly, no visual regression in cropping/aspect ratio.

Run: `npm run build`, then check `dist/assets/` (or wherever image assets land) — confirm no `.svg` men/women attire files are present, only the new `.webp` files, and that their combined size is a small fraction of the original ~7.2MB.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/optimize-images.mjs public/men-attire.webp public/women-attire.webp src/components/shared/DressCodeSection.tsx
git commit -m "perf: rasterize oversized attire SVGs to properly sized WebP images"
```

---

### Task 13: Defer the FAQ map image until its accordion item is opened

**Files:**
- Modify: `src/components/shared/FAQSection.tsx`

**Interfaces:**
- None external — internal to `FAQItem`.

- [ ] **Step 1: Track first-open state and gate the image mount**

In `src/components/shared/FAQSection.tsx`, find the `FAQItem` component:

```tsx
const FAQItem: React.FC<FAQItemProps> = ({ question, answer, image, onImageClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
```

Replace with:

```tsx
const FAQItem: React.FC<FAQItemProps> = ({ question, answer, image, onImageClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    setHasOpened(true);
  };

  return (
```

Find the toggle button:

```tsx
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group transition-all"
      >
```

Replace with:

```tsx
      <button
        onClick={toggleOpen}
        className="w-full py-6 flex items-center justify-between text-left group transition-all"
      >
```

Find the image block:

```tsx
          {image && (
            <div 
              className="mt-4 rounded-xl overflow-hidden border border-wedding-gold/20 shadow-sm relative group/image cursor-zoom-in"
              onClick={() => onImageClick?.(image)}
            >
              <img 
                src={image} 
                alt="Overview" 
                className="w-full h-auto transition-transform duration-500 group-hover/image:scale-105"
                loading="eager"
                decoding="async"
              />
```

Replace the `loading="eager"` line and the `{image && (` condition — change `{image && (` to `{image && hasOpened && (` and change `loading="eager"` to `loading="lazy"`:

```tsx
          {image && hasOpened && (
            <div 
              className="mt-4 rounded-xl overflow-hidden border border-wedding-gold/20 shadow-sm relative group/image cursor-zoom-in"
              onClick={() => onImageClick?.(image)}
            >
              <img 
                src={image} 
                alt="Overview" 
                className="w-full h-auto transition-transform duration-500 group-hover/image:scale-105"
                loading="lazy"
                decoding="async"
              />
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, open the landing page, open Network tab filtered to Img, reload.
Expected: `map-data.svg` does **not** appear in the Network tab on initial load. Scroll to FAQ, expand "Is there parking available?" — confirm `map-data.svg` now loads, and the image displays correctly. Collapse and re-expand the item — confirm it does not re-fetch (browser cache) and still displays.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/FAQSection.tsx
git commit -m "perf: defer FAQ map image fetch until its accordion item is opened"
```

---

### Task 14: Fix font loading and the dangling favicon reference

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

**Interfaces:**
- None external.

- [ ] **Step 1: Confirm the favicon target exists**

Run: `ls public/favicon.svg`
Expected: file exists (it does — confirmed present in `/public`). This replaces `index.html`'s current reference to `/vite.svg`, which does not exist in `/public` and 404s on every page load.

- [ ] **Step 2: Rewrite index.html's `<head>`**

Modify `index.html` to:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Israel & Deborah's Wedding</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Ballet&family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400;1,700&display=swap"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

This drops Montserrat, Playfair Display, and Pinyon Script from the request entirely (verified unused — Montserrat is shadowed by `Geist Variable` in the compiled CSS's `--font-sans`, and neither `font-display` nor `font-script` Tailwind utility classes appear anywhere in the codebase), and trims Cormorant Garamond from 10 weight/style variants down to the 4 actually used (400 and 700, roman and italic).

- [ ] **Step 3: Remove the CSS `@import` and dead font theme variables**

Modify `src/index.css`. Delete line 1 entirely:

```css
@import url('https://fonts.googleapis.com/css2?family=Ballet&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Montserrat:wght@100;200;300;400;500;600;700;800;900&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap');
```

Then find the `@theme` block:

```css
@theme {
  --font-serif: "Cormorant Garamond", serif;
  --font-display: "Playfair Display", serif;
  --font-sans: "Montserrat", sans-serif;
  --font-script: "Pinyon Script", cursive;
  --font-ballet: "Ballet", cursive;

  --color-wedding-gold: #C5A059;
  --color-wedding-cream: #FDFBF7;
  --color-wedding-dark: #1A1A1A;
}
```

Replace with:

```css
@theme {
  --font-serif: "Cormorant Garamond", serif;
  --font-ballet: "Ballet", cursive;

  --color-wedding-gold: #C5A059;
  --color-wedding-cream: #FDFBF7;
  --color-wedding-dark: #1A1A1A;
}
```

(`--font-display`, `--font-sans` here, and `--font-script` are removed because they're all dead: `--font-sans` is unconditionally overridden by the later `@theme inline` block's `--font-sans: 'Geist Variable', sans-serif;` — confirmed by inspecting the compiled production CSS, which contains exactly one `--font-sans` declaration, resolving to `"Geist Variable", sans-serif` — and `--font-display`/`--font-script` have no corresponding `font-display`/`font-script` utility class used anywhere in `src/`. Do not touch the `@theme inline` block below this one — it's unrelated shadcn/ui token wiring (sidebar, chart colors, radius) outside this task's scope.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` (no TS changes here, but confirms nothing else broke)
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

Run: `npm run dev`, open the landing page, open Network tab filtered to Font/CSS, reload.
Expected: exactly one request to `fonts.googleapis.com/css2` (now via `<link>`, discovered immediately from `index.html` rather than after the app CSS parses), requesting only Ballet and Cormorant Garamond. Visually confirm: the "Israel & Deborah" hero heading and other `font-ballet` text still render in the script font; italic serif body text (e.g. the Tagalog invitation copy) still renders correctly; headings/body sans text is unchanged (it was already rendering as Geist Variable before this change, not Montserrat). Confirm the browser tab now shows the wedding favicon instead of a broken icon / Vite default.

- [ ] **Step 5: Commit**

```bash
git add index.html src/index.css
git commit -m "perf: move font loading to link tags, drop unused font families, fix favicon"
```

---

### Task 15: Final verification and before/after comparison

**Files:** none (verification only).

- [ ] **Step 1: Production build**

Run: `npm run build`

- [ ] **Step 2: Compare bundle size to the documented baseline**

Before this sub-project's changes, a full production build produced a single entry chunk:
```
dist/assets/index-935Z0ZbC.js   3,120.79 kB │ gzip: 904.52 kB
dist/assets/index-CqOqE1pV.css    101.91 kB │ gzip:  16.75 kB
```
(captured directly from this codebase during planning, before any task in this plan was applied)

Run: `ls -la dist/assets/*.js` (or check file sizes via your OS file browser) and identify the chunk that `index.html`'s `<script type="module" src="...">` points at (the guest-facing entry chunk, i.e. what a visitor to `/` actually downloads before any admin navigation).
Expected: that entry chunk's size is substantially smaller than 3,120.79 kB / 904.52 kB gzip, since `xlsx`, `exceljs`, `@dnd-kit/*`, `recharts`, `react-day-picker`, `cmdk`, and all admin page code are now in separate lazy chunks not requested until `/admin` is visited. Record the new number.

- [ ] **Step 3: Confirm dead assets are gone**

Run: `ls public/*.svg`
Expected: only `favicon.svg` and `map-data.svg` remain (the orchid/petal/paper-bg files and the men/women attire SVGs were deleted in Tasks 11–12).

- [ ] **Step 4: Manual Lighthouse pass**

Run: `npm run preview` (serves the production build)
Open the preview URL in Chrome, open DevTools → Lighthouse, run a Mobile report against `/?inviteUrl=<a-real-or-test-invite-id>`.
Record: Performance score, LCP, CLS, and Total Blocking Time. There is no prior Lighthouse baseline to diff against numerically (none was captured before this sub-project began), so treat this run as the new baseline going forward — but the bundle-size reduction from Step 2 and the fetch/write-count reductions verified in Tasks 5, 6, and 13 are the concrete, already-confirmed evidence that the diagnosed root causes are fixed.

- [ ] **Step 5: Full manual walkthrough**

With `npm run dev` running, walk through the entire guest flow once: load `/`, scroll through every section (hero, venue, dress code, program, gifts, FAQ), open an RSVP link, toggle guest statuses, submit. Confirm no visual regressions, no console errors, and no broken images.

- [ ] **Step 6: Record results**

Append a `## Results` section to `docs/superpowers/specs/2026-07-31-rsvp-portal-performance-design.md` with the entry-chunk before/after sizes from Step 2 and the Lighthouse metrics from Step 4, then commit:

```bash
git add docs/superpowers/specs/2026-07-31-rsvp-portal-performance-design.md
git commit -m "docs: record RSVP portal performance results"
```
