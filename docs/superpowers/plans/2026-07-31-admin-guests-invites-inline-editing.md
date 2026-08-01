# Admin Guests & Invites Inline Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace click-to-open-a-modal editing of `name`/`nickname` on `AdminGuests.tsx`/`AdminInvites.tsx` with click-to-edit-in-place table cells, and move the remaining structural fields (role, table assignment, invite group, baby/parent, guest-assignment) from a centered `Dialog` into a slide-over `Sheet`.

**Architecture:** One new shared `EditableCell` component (click → input → commit on Enter/blur, cancel on Escape) used by both `GuestRow.tsx` and `InviteRow.tsx`. Single-field commits go straight to Firestore via `updateDoc`, bypassing the existing whole-form submit handlers. The existing edit `Dialog`s become `Sheet`s using the same shadcn `Sheet` component already used in `AdminLayout.tsx`'s mobile nav — no new dependency.

**Tech Stack:** React 18, TypeScript, Firebase Firestore, shadcn `Sheet`/`Input` (existing).

**Spec:** `docs/superpowers/specs/2026-07-31-admin-guests-invites-inline-editing-design.md`

## Global Constraints

- No visual rebrand — stay within the existing wedding-gold/slate design language; this is a targeted interaction + panel-container change, not a restyle. Source: spec "Explicitly out of scope."
- `AdminDashboard`, `AdminBudget`, `AdminReports`, `AdminTables`, `AdminWaitingList` are untouched — this plan only modifies `AdminGuests.tsx`, `AdminInvites.tsx`, and their extracted row components. Source: spec "Explicitly out of scope."
- Only `name`/`nickname` (guests) and `name` (invites) become inline-editable. Role, table assignment, invite group, baby/parent fields, and invite guest-assignment stay in the panel. Source: spec "Key Decisions."
- Verification is manual only. No test runner is introduced. Source: spec "Explicitly out of scope," consistent with the rest of this project.
- On inline-edit failure, revert to the pre-edit value and `toast.error(...)` — no special retry-in-place UI. Source: spec Section 2.
- **React 18 note:** this codebase's `Input` component (`src/components/ui/input.tsx`) is a plain function component, not wrapped in `React.forwardRef`. Do not pass a `ref` prop to it — it will silently fail to attach in React 18. Use the `autoFocus` HTML attribute (passed through via props spread) for auto-focus behavior instead, with an `onFocus` handler calling `e.target.select()` if select-all-on-focus is wanted.

---

### Task 1: Create the EditableCell component

**Files:**
- Create: `src/components/admin/EditableCell.tsx`

**Interfaces:**
- Consumes: `Input` from `@/components/ui/input` (existing), `cn` from `@/lib/utils` (existing).
- Produces: `EditableCell` (named export), props `{ value: string; onSave: (newValue: string) => void; placeholder?: string; allowEmpty?: boolean; className?: string; inputClassName?: string }`. Consumed by Task 2 (`GuestRow.tsx`) and Task 3 (`InviteRow.tsx`).

- [ ] **Step 1: Create the component**

Create `src/components/admin/EditableCell.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
  inputClassName?: string;
}

export function EditableCell({
  value,
  onSave,
  placeholder,
  allowEmpty = false,
  className,
  inputClassName,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  const commit = () => {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed === value) return;
    if (!trimmed && !allowEmpty) {
      setDraft(value);
      return;
    }
    onSave(trimmed);
  };

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => e.target.select()}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        placeholder={placeholder}
        className={cn('h-8 px-2 text-sm', inputClassName)}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn('cursor-pointer', className)}
      title="Click to edit"
    >
      {value || <span className="text-slate-300 italic">{placeholder || 'Click to edit'}</span>}
    </span>
  );
}
```

Behavior notes for the implementer:
- Display mode always renders the `value` **prop**, never `draft` — this is deliberate. `draft` is a sandboxed edit-in-progress buffer that's discarded on both `commit()` and `cancel()`. Because the parent's `value` only changes once Firestore's write actually succeeds (the value comes from a live `onSnapshot` listener upstream), a failed write means `value` never changes, so display mode automatically "reverts" with no extra error-handling code needed here — the caller's `onSave` is responsible for toasting the failure.
- `allowEmpty` distinguishes required fields (name — empty input reverts, doesn't save) from optional ones (nickname — empty input is a valid save that clears the field).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (no consumers yet, but must type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/EditableCell.tsx
git commit -m "feat: add EditableCell component for inline table-cell editing"
```

---

### Task 2: Wire inline editing and Sheet panel into AdminGuests.tsx

**Files:**
- Modify: `src/components/admin/guests/GuestRow.tsx`
- Modify: `src/pages/admin/AdminGuests.tsx`

**Interfaces:**
- Consumes: `EditableCell` from `@/components/admin/EditableCell` (Task 1).
- Produces: `GuestRow` gains a new required prop `onUpdateField: (id: string, field: 'name' | 'nickname', value: string) => void`.

This task touches both files together in one commit — `GuestRow.tsx`'s new prop has no caller until `AdminGuests.tsx` supplies it, and `AdminGuests.tsx`'s new handler has no consumer until `GuestRow.tsx` accepts it. Splitting them would leave an intermediate commit that doesn't compile (a required prop with no value at its call site), the same reasoning used throughout this project's prior sub-projects.

- [ ] **Step 1: Add the `onUpdateField` prop and EditableCell to GuestRow.tsx**

In `src/components/admin/guests/GuestRow.tsx`, add the import. Find:

```tsx
import { Copy, UserCheck, UserX, UserMinus, Edit2, Trash2, MessageSquare, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import type { Guest } from '@/features/guests/types';
```

Replace with:

```tsx
import { Copy, UserCheck, UserX, UserMinus, Edit2, Trash2, MessageSquare, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import { EditableCell } from '@/components/admin/EditableCell';
import type { Guest } from '@/features/guests/types';
```

Add the new prop to the interface. Find:

```tsx
interface GuestRowProps {
  guest: Guest & { invite_name?: string | null };
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateStatus: (ids: string[], status: boolean | null) => void;
  onMoveToWaiting: (ids: string[]) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (id: string) => void;
  onCopyMessage: (guest: Guest) => void;
}
```

Replace with:

```tsx
interface GuestRowProps {
  guest: Guest & { invite_name?: string | null };
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateStatus: (ids: string[], status: boolean | null) => void;
  onMoveToWaiting: (ids: string[]) => void;
  onUpdateField: (id: string, field: 'name' | 'nickname', value: string) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (id: string) => void;
  onCopyMessage: (guest: Guest) => void;
}
```

Add the new prop to the destructured function parameters. Find:

```tsx
function GuestRowComponent({
  guest,
  selected,
  onToggleSelect,
  onUpdateStatus,
  onMoveToWaiting,
  onEdit,
  onDelete,
  onCopyMessage,
}: GuestRowProps) {
```

Replace with:

```tsx
function GuestRowComponent({
  guest,
  selected,
  onToggleSelect,
  onUpdateStatus,
  onMoveToWaiting,
  onUpdateField,
  onEdit,
  onDelete,
  onCopyMessage,
}: GuestRowProps) {
```

Replace the name/nickname display cell. Find:

```tsx
      <TableCell className="py-6 px-8">
        <div className="font-semibold text-slate-700">{guest.name}</div>
        {guest.nickname && (
          <div className="text-[10px] text-slate-400 italic">"{guest.nickname}"</div>
        )}
        {(guest.table_type || guest.table_number) && (
```

Replace with:

```tsx
      <TableCell className="py-6 px-8">
        <EditableCell
          value={guest.name}
          onSave={(newValue) => onUpdateField(guest.id, 'name', newValue)}
          className="font-semibold text-slate-700 hover:underline decoration-dotted decoration-slate-300 underline-offset-2"
          inputClassName="h-7 px-2 text-sm font-semibold"
        />
        <EditableCell
          value={guest.nickname || ''}
          onSave={(newValue) => onUpdateField(guest.id, 'nickname', newValue)}
          placeholder="Add nickname"
          allowEmpty
          className="block text-[10px] text-slate-400 italic hover:underline decoration-dotted underline-offset-2"
          inputClassName="h-6 px-2 text-xs italic mt-0.5"
        />
        {(guest.table_type || guest.table_number) && (
```

(`EditableCell`'s span display isn't block-level by default; the `block` class on the nickname cell keeps it on its own line below the name, matching the original two-line layout.)

- [ ] **Step 2: Add the onUpdateField handler and wire it into AdminGuests.tsx**

In `src/pages/admin/AdminGuests.tsx`, add the Sheet import. Find:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
```

Replace with:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
```

Add the new handler. Find:

```tsx
  const handleEditClick = useCallback((guest: Guest) => {
    setEditingGuest(guest);
    setIsEditOpen(true);
  }, []);
```

Replace with:

```tsx
  const handleEditClick = useCallback((guest: Guest) => {
    setEditingGuest(guest);
    setIsEditOpen(true);
  }, []);

  const onUpdateField = useCallback(async (id: string, field: 'name' | 'nickname', value: string) => {
    try {
      await updateDoc(doc(db, 'guests', id), {
        [field]: field === 'nickname' && !value ? null : value,
        updated_at: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${id}`);
      toast.error(`Failed to update ${field}`);
    }
  }, []);
```

Pass it to `GuestRow`. Find:

```tsx
              <GuestRow
                key={guest.id}
                guest={guest}
                selected={selectedIds.includes(guest.id)}
                onToggleSelect={toggleSelect}
                onUpdateStatus={handleUpdateStatus}
                onMoveToWaiting={handleMoveToWaitingList}
                onEdit={handleEditClick}
                onDelete={handleDeleteGuest}
                onCopyMessage={copyMessage}
              />
```

Replace with:

```tsx
              <GuestRow
                key={guest.id}
                guest={guest}
                selected={selectedIds.includes(guest.id)}
                onToggleSelect={toggleSelect}
                onUpdateStatus={handleUpdateStatus}
                onMoveToWaiting={handleMoveToWaitingList}
                onUpdateField={onUpdateField}
                onEdit={handleEditClick}
                onDelete={handleDeleteGuest}
                onCopyMessage={copyMessage}
              />
```

- [ ] **Step 3: Simplify handleEditGuest (name/nickname no longer submitted from this form)**

Find:

```tsx
  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;
    try {
      await updateDoc(doc(db, 'guests', editingGuest.id), {
        name: editingGuest.name,
        nickname: editingGuest.nickname || null,
        role: editingGuest.role || null,
        invite_id: editingGuest.invite_id || null,
        table_type: editingGuest.table_type || null,
        table_number: editingGuest.table_number || null,
        is_baby_or_child: editingGuest.is_baby_or_child || false,
        parent_name: editingGuest.parent_name || null,
        updated_at: serverTimestamp()
      });
      toast.success('Guest updated successfully');
      setIsEditOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${editingGuest.id}`);
      toast.error('Failed to update guest');
    }
  };
```

Replace with:

```tsx
  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;
    try {
      await updateDoc(doc(db, 'guests', editingGuest.id), {
        role: editingGuest.role || null,
        invite_id: editingGuest.invite_id || null,
        table_type: editingGuest.table_type || null,
        table_number: editingGuest.table_number || null,
        is_baby_or_child: editingGuest.is_baby_or_child || false,
        parent_name: editingGuest.parent_name || null,
        updated_at: serverTimestamp()
      });
      toast.success('Guest updated successfully');
      setIsEditOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${editingGuest.id}`);
      toast.error('Failed to update guest');
    }
  };
```

`editingGuest` (the state object) still carries `name`/`nickname` internally — that's fine and unused-but-harmless; only the submitted payload changes.

- [ ] **Step 4: Swap the edit Dialog for a Sheet and remove the name/nickname fields**

Find the entire edit block, from its opening `<Dialog open={isEditOpen}...>` through its closing `</Dialog>` (this is the last top-level block in the component, right before the closing `</div>` of the whole component):

```tsx
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditGuest} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  required 
                  value={editingGuest?.name || ''} 
                  onChange={e => setEditingGuest(prev => prev ? ({ ...prev, name: e.target.value }) : null)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Nickname</Label>
                <Input 
                  value={editingGuest?.nickname || ''} 
                  onChange={e => setEditingGuest(prev => prev ? ({ ...prev, nickname: e.target.value }) : null)} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
```

Replace this opening portion (through the start of the Role field) with:

```tsx
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="data-[side=right]:sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit {editingGuest?.name}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleEditGuest} className="space-y-4 px-4 pb-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label>Role</Label>
```

Everything from the Role `<select>` through the closing `</form>` stays **exactly as it is today** (role dropdown, baby/child checkbox, parent-name popover, invitation-group popover, table category/number fields, the "Save Changes" submit button) — no changes to that JSX.

Then find the final closing tags of this block:

```tsx
            <Button type="submit" className="w-full bg-wedding-gold">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Replace with:

```tsx
            <Button type="submit" className="w-full bg-wedding-gold">Save Changes</Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint` (note: this repo's eslint config has no rules for `.ts`/`.tsx` files — not meaningful signal, run it anyway for the record but don't rely on it).

Run: `npm run dev`, log into `/admin/guests`.
Expected: clicking a guest's name shows an input in place; typing and pressing Enter commits the change and the cell shows the new name; pressing Escape while editing discards the change; clicking away (blur) commits like Enter; clicking a guest's nickname behaves the same way, and can be set from empty (shows "Add nickname" placeholder when empty) or cleared back to empty. Clicking the row's Edit icon opens a slide-over panel from the right (not a centered dialog) titled "Edit `<name>`", showing role/table/invite-group/baby-parent fields but NOT name/nickname inputs; submitting it still saves those fields correctly. The Add Guest dialog (still a centered `Dialog`) is unaffected and still has name/nickname fields, since it's for guests that don't exist yet.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/guests/GuestRow.tsx src/pages/admin/AdminGuests.tsx
git commit -m "feat: inline edit guest name/nickname, move guest edit panel to a Sheet"
```

---

### Task 3: Wire inline editing and Sheet panel into AdminInvites.tsx

**Files:**
- Modify: `src/components/admin/invites/InviteRow.tsx`
- Modify: `src/pages/admin/AdminInvites.tsx`

**Interfaces:**
- Consumes: `EditableCell` from `@/components/admin/EditableCell` (Task 1).
- Produces: `InviteRow` gains a new required prop `onUpdateName: (id: string, value: string) => void`.

Same reasoning as Task 2: both files land in one commit since `InviteRow`'s new prop and `AdminInvites`'s new handler only make sense together.

Unlike guests, an invite's `name` was the **only** field in its edit form's top section (there's no role/table/baby-parent equivalent for invites) — moving it to inline editing leaves that form section with nothing left to submit. This task therefore removes `handleEditInvite` and its `<form>` entirely, keeping only the "Assigned Guests" management section in the Sheet.

- [ ] **Step 1: Add the `onUpdateName` prop and EditableCell to InviteRow.tsx**

In `src/components/admin/invites/InviteRow.tsx`, add the import. Find:

```tsx
import { Copy, Edit2, Trash2, MessageSquare } from 'lucide-react';
import type { Invite, InviteWithCounts } from '@/features/invites/types';
```

Replace with:

```tsx
import { Copy, Edit2, Trash2, MessageSquare } from 'lucide-react';
import { EditableCell } from '@/components/admin/EditableCell';
import type { Invite, InviteWithCounts } from '@/features/invites/types';
```

Add the new prop. Find:

```tsx
interface InviteRowProps {
  invite: InviteWithCounts;
  onCopyLink: (id: string) => void;
  onCopyMessage: (invite: Invite) => void;
  onEdit: (invite: InviteWithCounts) => void;
  onDelete: (id: string) => void;
}

function InviteRowComponent({ invite, onCopyLink, onCopyMessage, onEdit, onDelete }: InviteRowProps) {
```

Replace with:

```tsx
interface InviteRowProps {
  invite: InviteWithCounts;
  onCopyLink: (id: string) => void;
  onCopyMessage: (invite: Invite) => void;
  onUpdateName: (id: string, value: string) => void;
  onEdit: (invite: InviteWithCounts) => void;
  onDelete: (id: string) => void;
}

function InviteRowComponent({ invite, onCopyLink, onCopyMessage, onUpdateName, onEdit, onDelete }: InviteRowProps) {
```

Replace the name display cell. Find:

```tsx
      <TableCell className="py-6 px-8 font-semibold text-slate-700">{invite.name}</TableCell>
```

Replace with:

```tsx
      <TableCell className="py-6 px-8">
        <EditableCell
          value={invite.name}
          onSave={(newValue) => onUpdateName(invite.id, newValue)}
          className="font-semibold text-slate-700 hover:underline decoration-dotted decoration-slate-300 underline-offset-2"
          inputClassName="h-7 px-2 text-sm font-semibold"
        />
      </TableCell>
```

- [ ] **Step 2: Add the onUpdateName handler and wire it into AdminInvites.tsx**

In `src/pages/admin/AdminInvites.tsx`, add the Sheet import. Find:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
```

Replace with:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
```

Add the new handler and remove `handleEditInvite` (no longer has any UI calling it after Step 4). Find:

```tsx
  const handleEditClick = useCallback((invite: InviteWithCounts) => {
    setEditingInvite(invite);
    setIsEditOpen(true);
  }, []);

  const handleAddInvite = async (e: React.FormEvent) => {
```

Replace with:

```tsx
  const handleEditClick = useCallback((invite: InviteWithCounts) => {
    setEditingInvite(invite);
    setIsEditOpen(true);
  }, []);

  const onUpdateName = useCallback(async (id: string, value: string) => {
    try {
      await updateDoc(doc(db, 'invites', id), { name: value });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invites/${id}`);
      toast.error('Failed to update invitation name');
    }
  }, []);

  const handleAddInvite = async (e: React.FormEvent) => {
```

Then find and delete `handleEditInvite` entirely:

```tsx
  const handleEditInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvite) return;
    try {
      await updateDoc(doc(db, 'invites', editingInvite.id), {
        name: editingInvite.name
      });
      toast.success('Invitation updated successfully');
      setIsEditOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invites/${editingInvite.id}`);
      toast.error('Failed to update invitation');
    }
  };

```

(Delete this whole function, including its trailing blank line, leaving `handleAddInvite` and `handleDeleteInvite` adjacent to each other with the same spacing pattern as elsewhere in the file.)

Pass the new prop to `InviteRow`. Find:

```tsx
              <InviteRow
                key={invite.id}
                invite={invite}
                onCopyLink={copyLink}
                onCopyMessage={copyMessage}
                onEdit={handleEditClick}
                onDelete={handleDeleteInvite}
              />
```

Replace with:

```tsx
              <InviteRow
                key={invite.id}
                invite={invite}
                onCopyLink={copyLink}
                onCopyMessage={copyMessage}
                onUpdateName={onUpdateName}
                onEdit={handleEditClick}
                onDelete={handleDeleteInvite}
              />
```

- [ ] **Step 3: Swap the edit Dialog for a Sheet and remove the name-editing form**

Find the entire edit block, from its opening `<Dialog open={isEditOpen}...>` through its closing `</Dialog>`:

```tsx
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Invite: {editingInvite?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            <form onSubmit={handleEditInvite} className="space-y-4 pb-6 border-b border-slate-100">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Group Name</Label>
                <Input 
                  value={editingInvite?.name || ''} 
                  onChange={e => setEditingInvite(prev => prev ? ({ ...prev, name: e.target.value }) : null)} 
                  className="bg-slate-50/50 border-slate-200"
                />
              </div>
              <Button type="submit" className="w-full bg-wedding-gold hover:bg-wedding-gold/90 text-white font-medium">
                Update Settings
              </Button>
            </form>

            <div className="space-y-4">
              <Label className="text-lg font-serif">Assigned Guests</Label>
```

Replace with:

```tsx
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="data-[side=right]:sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Invite: {editingInvite?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 overflow-y-auto flex-1 px-4 pb-4">
            <div className="space-y-4">
              <Label className="text-lg font-serif">Assigned Guests</Label>
```

Everything from the "Assigned Guests" label through the "Add from existing pool" section stays **exactly as it is today** — no changes to that JSX (the guest list, the remove buttons, the searchable add-guest popover, the Add button).

Then find the closing tags:

```tsx
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Replace with:

```tsx
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. This will also confirm `handleEditInvite`'s removal didn't leave a dangling reference anywhere.

Run: `grep -n "handleEditInvite" src/pages/admin/AdminInvites.tsx`
Expected: no output (fully removed, not just unused).

Run: `npm run dev`, log into `/admin/invites`.
Expected: clicking an invite's name shows an input in place; Enter commits, Escape cancels, blur commits — same behavior as guests. Clicking the row's Edit icon opens a slide-over Sheet (not a centered dialog) titled "Edit Invite: `<name>`", showing only the "Assigned Guests" section (list of assigned guests with remove buttons, and the "Add from existing pool" searchable picker) — no "Group Name"/"Update Settings" form. The Add Invite dialog (still a centered `Dialog`) is unaffected and still has a name field, since it's for invites that don't exist yet.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/invites/InviteRow.tsx src/pages/admin/AdminInvites.tsx
git commit -m "feat: inline edit invite name, move invite edit panel to a Sheet"
```

---

### Task 4: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full-codebase checks**

Run: `npx tsc --noEmit` (whole project)
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 2: Confirm no dangling references**

Run: `grep -rn "handleEditInvite\|DialogTitle>Edit Guest<\|DialogTitle>Edit Invite:" src/pages/admin/AdminGuests.tsx src/pages/admin/AdminInvites.tsx`
Expected: no output — confirms `handleEditInvite` is fully gone from `AdminInvites.tsx`, and neither file still has the old `Dialog`-based edit-panel titles (both should now only exist as `SheetTitle` content, which this grep pattern won't match since it specifically looks for the old `DialogTitle>Edit ...` text).

- [ ] **Step 3: Manual walkthrough reasoning (no browser automation available)**

Read through the final `AdminGuests.tsx`/`AdminInvites.tsx`/`GuestRow.tsx`/`InviteRow.tsx` once more and confirm: every `Dialog`-specific import (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`) is still present in both page files (needed for the Add/Upload/Clear-data dialogs, which are unchanged) alongside the new `Sheet` imports — this plan adds `Sheet` usage, it doesn't remove `Dialog` usage entirely from either file.

- [ ] **Step 4: Record results**

Append a `## Results` section to `docs/superpowers/specs/2026-07-31-admin-guests-invites-inline-editing-design.md` summarizing: the tsc/build results, confirmation of no dangling `handleEditInvite` references, and an explicit note that a human should do a live browser walkthrough (click-to-edit on both name and nickname cells including the empty/clear cases, Escape-to-cancel, both Sheets opening/closing and their remaining functionality, and the two now-Dialog-only flows — Add Guest and Add Invite — still working unchanged) before treating this as fully verified in production.

Then commit:

```bash
git add docs/superpowers/specs/2026-07-31-admin-guests-invites-inline-editing-design.md
git commit -m "docs: record admin inline editing results"
```
