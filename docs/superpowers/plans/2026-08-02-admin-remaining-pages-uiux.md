# Admin Remaining Pages UI/UX Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `AdminSettings`' shared-save-button bug and tighten visual consistency across `AdminSettings`, `AdminDashboard`, and `AdminTables` to match the wedding-gold/slate language already established on `AdminGuests`/`AdminInvites`.

**Architecture:** No new components, no new patterns — targeted edits to 3 existing page files. `AdminSettings` gets two independent save handlers instead of one shared one, plus card/layout polish. `AdminDashboard` gets one real layout bug fixed (a single card sitting in a 2-column grid, wasting half the row) plus a rounding-consistency touch. `AdminTables`, already the most visually polished of the three, gets one small rounding-consistency touch.

**Tech Stack:** React 18, TypeScript, Tailwind, shadcn `Card`/`Button`/`Input`/`Label` components, `lucide-react` icons — unchanged, no new dependencies.

## Global Constraints

- No new fields, no new mechanisms, no new UI library — per the design spec, this is a polish pass, not a redesign.
- Manual verification only: `npx tsc --noEmit` + `npm run build` are the test signal. No test runner is introduced.
- `npx eslint . --report-unused-disable-directives --max-warnings 0` must pass with zero warnings on every task's diff.
- `AdminGuests`/`AdminInvites` are not revisited — out of scope.

---

### Task 1: AdminSettings — split save handlers, polish layout

**Files:**
- Modify: `src/pages/admin/AdminSettings.tsx` (full-file replacement — the file is 180 lines, small enough that a complete rewrite is clearer than a sequence of find/replace edits)

**Interfaces:** none — this is a leaf page component, nothing else imports from it beyond the route in `App.tsx` (unchanged, still `<Route path="settings" element={<AdminSettings />} />`).

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `src/pages/admin/AdminSettings.tsx` with:

```tsx
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

export default function AdminSettings() {
  const [deadline, setDeadline] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const deadlineSnap = await getDoc(doc(db, 'settings', 'rsvp_deadline'));
        if (deadlineSnap.exists()) {
          setDeadline(deadlineSnap.data().value);
        }

        const templateSnap = await getDoc(doc(db, 'settings', 'invite_message_template'));
        if (templateSnap.exists()) {
          setMessageTemplate(templateSnap.data().value);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSaveDeadline = async () => {
    setSavingDeadline(true);
    try {
      await setDoc(doc(db, 'settings', 'rsvp_deadline'), {
        key: 'rsvp_deadline',
        value: deadline,
        updated_at: new Date().toISOString()
      });
      toast.success('RSVP deadline saved');
    } catch (error) {
      console.error('Error saving RSVP deadline:', error);
      toast.error('Failed to save RSVP deadline');
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleSaveMessage = async () => {
    setSavingMessage(true);
    try {
      await setDoc(doc(db, 'settings', 'invite_message_template'), {
        key: 'invite_message_template',
        value: messageTemplate,
        updated_at: new Date().toISOString()
      });
      toast.success('Message template saved');
    } catch (error) {
      console.error('Error saving message template:', error);
      toast.error('Failed to save message template');
    } finally {
      setSavingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-serif mb-2">Settings</h1>
        <p className="text-slate-500">Manage application-wide configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-wedding-gold/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-wedding-gold" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl">RSVP Configuration</CardTitle>
                <CardDescription>Set the deadline for guest RSVPs.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="deadline">RSVP Deadline Date</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-slate-400">
                Leave empty for no deadline. After this date, the RSVP form will become view-only.
              </p>
            </div>

            <Button
              onClick={handleSaveDeadline}
              disabled={savingDeadline}
              className="bg-wedding-gold hover:bg-wedding-gold/90 text-white rounded-xl"
            >
              {savingDeadline ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-wedding-gold/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-wedding-gold" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl">Invitation Message</CardTitle>
                <CardDescription>Use {"<name>"} and {"<link>"} as placeholders.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="messageTemplate">Template</Label>
              <textarea
                id="messageTemplate"
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="w-full min-h-[160px] p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-wedding-gold/50"
                placeholder="Hello, <name>. We would like to cordially invite you... Please RSVP via our wedding website below: <link>"
              />
            </div>

            <Button
              onClick={handleSaveMessage}
              disabled={savingMessage}
              className="bg-wedding-gold hover:bg-wedding-gold/90 text-white rounded-xl"
            >
              {savingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

Summary of the changes from the current file:
- **Bug fix:** one `handleSave()`/`saving` pair split into `handleSaveDeadline`/`savingDeadline` and `handleSaveMessage`/`savingMessage`, each writing only its own Firestore document. Fixes the "clicking either button saves both cards" behavior.
- **Layout:** the two cards move from stacked, independently `max-w-2xl`-capped blocks into a `grid grid-cols-1 lg:grid-cols-2` pair — better use of horizontal space on desktop, matches the grid-heavy layout language used elsewhere in the admin panel (Dashboard's stat grid, the removed Budget page's overview grid).
- **Visual consistency:** cards get `border-none shadow-sm rounded-3xl overflow-hidden` (matching `AdminTables`' card treatment) instead of the previous `border-wedding-gold/10` outline-only style; each card header gets an icon-in-colored-box badge (`w-12 h-12 bg-wedding-gold/10 rounded-2xl` — the same pattern `AdminDashboard`'s stat cards and the removed `AdminBudget` page used); the page `<h1>` goes from `text-3xl` with an inline icon to `text-4xl` with no icon, matching every other admin page's plain `text-4xl` title (`AdminDashboard`, `AdminGuests`, `AdminInvites`, `AdminTables` all use a bare `text-4xl` `<h1>`); the `Input`/`Button`/`textarea` all get `rounded-xl` to match the rounder corners used elsewhere (`AdminTables`' `Input`/`Button` instances, `AdminGuests`' `Sheet` form inputs).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/pages/admin/AdminSettings.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminSettings.tsx
git commit -m "fix: split AdminSettings shared save button, polish card layout"
```

---

### Task 2: AdminDashboard — fix orphaned half-width card, rounding consistency

**Files:**
- Modify: `src/pages/admin/AdminDashboard.tsx`

**Interfaces:** none — leaf page component, unchanged route.

- [ ] **Step 1: Fix the RSVP Progress card's layout**

Current (the card sits alone inside a 2-column grid, leaving the second column empty — wasted horizontal space on desktop):

```tsx
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif">RSVP Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${stats.totalGuests > 0 ? (stats.attendingGuests / stats.totalGuests) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-rose-500"
                style={{ width: `${stats.totalGuests > 0 ? (stats.declinedGuests / stats.totalGuests) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-4 text-xs font-semibold text-slate-400">
              <span>{stats.totalGuests > 0 ? Math.round((stats.attendingGuests / stats.totalGuests) * 100) : 0}% Attending</span>
              <span>{stats.totalGuests > 0 ? Math.round((stats.declinedGuests / stats.totalGuests) * 100) : 0}% Declined</span>
            </div>
          </CardContent>
        </Card>
      </div>
```

Replace with (drop the 2-column grid wrapper — there's only ever one card here, so a full-width standalone card removes the wasted empty column; add `rounded-3xl overflow-hidden` to match `AdminSettings`' and `AdminTables`' card treatment):

```tsx
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden mt-12">
        <CardHeader>
          <CardTitle className="font-serif">RSVP Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${stats.totalGuests > 0 ? (stats.attendingGuests / stats.totalGuests) * 100 : 0}%` }}
            />
            <div
              className="h-full bg-rose-500"
              style={{ width: `${stats.totalGuests > 0 ? (stats.declinedGuests / stats.totalGuests) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between mt-4 text-xs font-semibold text-slate-400">
            <span>{stats.totalGuests > 0 ? Math.round((stats.attendingGuests / stats.totalGuests) * 100) : 0}% Attending</span>
            <span>{stats.totalGuests > 0 ? Math.round((stats.declinedGuests / stats.totalGuests) * 100) : 0}% Declined</span>
          </div>
        </CardContent>
      </Card>
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/pages/admin/AdminDashboard.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminDashboard.tsx
git commit -m "fix: AdminDashboard RSVP Progress card spans full width instead of half"
```

---

### Task 3: AdminTables rounding-consistency touch + final verification

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`

**Interfaces:** none.

`AdminTables` is already the most visually polished of the three pages in
scope (rounded-3xl cards, wedding-gold accents, hover states, drag
styling throughout) — it needs one small touch, not a broader pass.

- [ ] **Step 1: Bump the header stat pill's rounding to match the rest of the page**

Current (the "Tables / Unassigned" count pill in the page header uses `rounded-2xl`, while every card on this page — and now `AdminSettings`/`AdminDashboard`'s cards after Tasks 1-2 — uses `rounded-3xl`):

```tsx
            <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
```

Replace with:

```tsx
            <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-3xl shadow-sm border border-slate-100">
```

- [ ] **Step 2: Verify this file**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/pages/admin/AdminTables.tsx --report-unused-disable-directives --max-warnings 0`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminTables.tsx
git commit -m "style: AdminTables header stat pill rounding consistency"
```

- [ ] **Step 4: Full-project final verification**

Run: `npx tsc --noEmit`
Expected: zero errors, zero output.
Run: `npx eslint . --report-unused-disable-directives --max-warnings 0`
Expected: zero output.
Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Update the design spec with a Results section**

Append a `## Results` section to
`docs/superpowers/specs/2026-08-02-admin-remaining-pages-uiux-design.md`,
following the format of the `## Results` sections in this project's other
specs (e.g.
`docs/superpowers/specs/2026-08-02-admin-remove-budget-reports-waitinglist-design.md`)
— cover what was verified, the tsc/eslint/build output summary, and a
short "not verified — no browser automation available" list: a human
should confirm `AdminSettings`' two cards genuinely save independently
(edit both fields, save only one, refresh, confirm the other field's
Firestore value didn't change), confirm the `AdminDashboard` RSVP
Progress card renders full-width on a desktop viewport, and confirm
`AdminTables`' drag-and-drop still works visually unchanged (this task
only touched one `className` string on that page).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-08-02-admin-remaining-pages-uiux-design.md
git commit -m "docs: record admin UI/UX pass verification results"
```
