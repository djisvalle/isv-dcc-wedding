# Table Floor-Plan Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second view to the Table Arrangement admin page (`/admin/tables`) — a free-form drag/rotate/zoom/pan canvas for arranging table positions, shapes, and rotation to simulate the real venue layout.

**Architecture:** A view toggle in `AdminTables.tsx` switches between the existing seating-list grid (unchanged) and a new `TableFloorPlan` component built on `@xyflow/react` (React Flow). Table position/shape/rotation is stored in a new optional `layout` field on the existing `Table` type and persisted through the existing `settings/table_layout` Firestore document — no new collection, no changes to the `Guest` schema. The canvas is purely spatial: it shows live guest-occupancy counts per table but does not support guest drag-and-drop (that stays in the List view).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Firebase Firestore, `@xyflow/react` (new dependency, chosen in the design spec over `react-konva` and a hand-rolled approach for its DOM-based custom nodes and built-in pan/zoom/drag).

## Global Constraints

- No changes to the `Guest` TypeScript interface or Firestore security rules.
- The `Table` interface MAY be extended with one new optional field, `layout` (per the design spec) — no other schema changes.
- Exactly one new dependency is introduced this plan: `@xyflow/react`. Do not add any other new dependency without flagging it first.
- No guest-to-table assignment on the canvas — the canvas only arranges table position, shape, and rotation. Guest assignment stays exclusively in the existing List view.
- No manual resize handles on tables — shape (round/rectangle) and rotation only, per the design spec's non-goals. Width/height are fixed type-based defaults.
- No venue background image upload.
- No snapping/alignment guides or collision detection between tables.
- This project has **no automated test framework** (no `vitest`/`jest`, no test files anywhere in `src/`). Every task is verified by running the dev server (`npm run dev`, default `http://localhost:3000`) and manually exercising the change at `/admin/tables` (requires an authenticated admin session), matching the existing convention for this page. Do not add a test framework.
- Follow existing conventions: Tailwind utility classes only, icons from `lucide-react`, `sonner` toasts are already wired into the existing write paths this plan reuses (`persistTableLayout`) — no new toast/error-handling pattern needed.
- Commit after each task with a short imperative summary.
- `@xyflow/react`'s public TypeScript type names (`Node`, `NodeProps`, `NodeTypes`, etc.) are referenced by name in this plan based on its v12 API. If `npx tsc --noEmit` reports an export that doesn't match, check `node_modules/@xyflow/react/dist/esm/types/` for the current name and adjust the import — the runtime behavior described in each task is what matters, not the exact type alias spelling.

---

## Task 1: Data model — `Table.layout` field + `@xyflow/react` dependency

**Files:**
- Modify: `src/components/admin/tables/types.ts`
- Modify: `package.json` (via `npm install`, not hand-edited)

**Interfaces:**
- Produces: `Table['layout']?: { x: number; y: number; rotation: number; shape: 'round' | 'rectangle'; width: number; height: number }` — consumed by Tasks 3, 4, and 5.

- [ ] **Step 1: Install the new dependency**

Run from the worktree root:

```bash
npm install @xyflow/react@12.11.2
```

This updates `package.json` and `package-lock.json` automatically — do not hand-edit `package.json`.

- [ ] **Step 2: Extend the `Table` interface**

In `src/components/admin/tables/types.ts`, find:

```ts
export interface Table {
  id: string; // key: type-number
  type: 'bridal' | 'vip' | 'regular';
  number: string;
  capacity?: number; // undefined = uncapped
}
```

Replace with:

```ts
export interface Table {
  id: string; // key: type-number
  type: 'bridal' | 'vip' | 'regular';
  number: string;
  capacity?: number; // undefined = uncapped
  layout?: {
    x: number;
    y: number;
    rotation: number; // degrees, 0-359
    shape: 'round' | 'rectangle';
    width: number;
    height: number;
  };
}
```

- [ ] **Step 3: Persist `layout` alongside the other table fields**

In the same file, find `persistTableLayout`:

```ts
export async function persistTableLayout(tables: Table[]) {
  try {
    await setDoc(doc(db, 'settings', TABLE_LAYOUT_SETTING_ID), {
      key: TABLE_LAYOUT_SETTING_ID,
      value: JSON.stringify(tables.map(({ id, type, number, capacity }) => ({ id, type, number, capacity }))),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `settings/${TABLE_LAYOUT_SETTING_ID}`);
  }
}
```

Change the serialized fields to include `layout`:

```ts
export async function persistTableLayout(tables: Table[]) {
  try {
    await setDoc(doc(db, 'settings', TABLE_LAYOUT_SETTING_ID), {
      key: TABLE_LAYOUT_SETTING_ID,
      value: JSON.stringify(tables.map(({ id, type, number, capacity, layout }) => ({ id, type, number, capacity, layout }))),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `settings/${TABLE_LAYOUT_SETTING_ID}`);
  }
}
```

`mergeTables` (the dedupe-by-id helper right above this in the same file) needs no changes — it already keeps whole `Table` objects from whichever list wins, and `layout` travels with the object automatically, the same way `capacity` already does.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` from the worktree root.
Expected: clean, no errors (this is a type-only change plus one new field in a `JSON.stringify` call — nothing else in the codebase reads `Table.layout` yet, so nothing else should be affected).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/admin/tables/types.ts
git commit -m "feat: add Table.layout field and @xyflow/react dependency for floor-plan canvas"
```

---

## Task 2: View toggle scaffold (Seating List / Floor Plan tabs)

**Files:**
- Modify: `src/pages/admin/AdminTables.tsx`
- Create: `src/components/admin/tables/TableFloorPlan.tsx` (stub — Task 4 replaces the body)

**Interfaces:**
- Produces (stub, Task 4 changes this): `TableFloorPlan` component, no props required yet.

- [ ] **Step 1: Create the stub component**

Create `src/components/admin/tables/TableFloorPlan.tsx`:

```tsx
export function TableFloorPlan() {
  return (
    <div className="h-[70vh] rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400">
      <p className="font-serif text-lg">Floor plan canvas coming soon</p>
    </div>
  );
}
```

- [ ] **Step 2: Import it and add view state**

In `src/pages/admin/AdminTables.tsx`, find the import of `UnassignedContainer` (currently the last import in the local-components group):

```tsx
import { UnassignedContainer } from '@/components/admin/tables/UnassignedContainer';
```

Add directly after it:

```tsx
import { UnassignedContainer } from '@/components/admin/tables/UnassignedContainer';
import { TableFloorPlan } from '@/components/admin/tables/TableFloorPlan';
```

Find the `capacityFilter` state declaration:

```tsx
  const [capacityFilter, setCapacityFilter] = useState<'all' | 'room' | 'full' | 'over'>('all');
```

Add directly after it:

```tsx
  const [capacityFilter, setCapacityFilter] = useState<'all' | 'room' | 'full' | 'over'>('all');
  const [view, setView] = useState<'list' | 'floorplan'>('list');
```

- [ ] **Step 3: Add the toggle buttons to the header**

Find this block (the start of the header's right-hand button/stat row):

```tsx
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-3xl shadow-sm border border-slate-100">
```

Replace with:

```tsx
          <div className="flex flex-wrap gap-4 items-center">
            <div className="inline-flex bg-white rounded-2xl shadow-sm border border-slate-100 p-1 print:hidden">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${view === 'list' ? 'bg-wedding-gold text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Seating List
              </button>
              <button
                type="button"
                onClick={() => setView('floorplan')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${view === 'floorplan' ? 'bg-wedding-gold text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Floor Plan
              </button>
            </div>
            <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-3xl shadow-sm border border-slate-100">
```

- [ ] **Step 4: Wrap the filter bar + table grid in the List view branch**

Find:

```tsx
        <div className="flex flex-wrap gap-4 items-end print:hidden">
          <div className="flex-1 min-w-[240px]">
```

Replace with:

```tsx
        {view === 'list' && (
        <>
        <div className="flex flex-wrap gap-4 items-end print:hidden">
          <div className="flex-1 min-w-[240px]">
```

- [ ] **Step 5: Close the List view branch and add the Floor Plan branch**

Find the end of the table-grid section (the four closing `</div>` tags right before `<DragOverlay`):

```tsx
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{
```

Replace with:

```tsx
            </div>
          </div>
        </div>
        </>
        )}

        {view === 'floorplan' && (
          <div className="space-y-4">
            <div className="md:hidden bg-white rounded-3xl border-2 border-dashed border-slate-100 py-20 text-center text-slate-400">
              <p className="font-serif text-lg text-slate-600 mb-1">Floor plan editing needs more room</p>
              <p className="text-sm">This view works best on a larger screen — try a tablet or desktop.</p>
            </div>
            <div className="hidden md:block">
              <TableFloorPlan />
            </div>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — expect clean.

Run: `npm run dev`, visit `http://localhost:3000/admin/tables` (log in as admin).
- Confirm the page loads on "Seating List" by default, identical to before this task.
- Click "Floor Plan" — confirm the filter bar and the Unassigned sidebar/mobile FAB disappear, and a dashed placeholder box reading "Floor plan canvas coming soon" appears in their place.
- Click "Seating List" again — confirm everything (filters, tables, sidebar, drag-and-drop) still works exactly as before.
- Resize the browser window below ~768px width (or use devtools device emulation) while on the Floor Plan tab — confirm the placeholder box is replaced by a "Floor plan editing needs more room" message instead.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminTables.tsx src/components/admin/tables/TableFloorPlan.tsx
git commit -m "feat: add Seating List / Floor Plan view toggle to AdminTables"
```

---

## Task 3: Shared table-display helpers + cascade-placement defaults

**Files:**
- Create: `src/components/admin/tables/tableDisplay.tsx`
- Create: `src/components/admin/tables/floorPlanDefaults.ts`
- Modify: `src/components/admin/tables/DroppableTable.tsx`

**Interfaces:**
- Produces: `getTableIcon(type: string): JSX.Element`, `getTableTitle(type: string, number: string): string` (from `tableDisplay.tsx`) — consumed by Task 4's `FloorPlanTableNode`.
- Produces: `getDefaultLayout(index: number, type: Table['type']): NonNullable<Table['layout']>` (from `floorPlanDefaults.ts`) — consumed by Task 4's `TableFloorPlan`.

This task is a pure refactor + a new pure-logic file — no visible UI change. It exists so Task 4's new node component can reuse the exact same icon/title rendering `DroppableTable` already uses, instead of duplicating that switch statement in a second place.

- [ ] **Step 1: Create the shared display helpers**

Create `src/components/admin/tables/tableDisplay.tsx`:

```tsx
import { User, Crown, Star, GlassWater } from 'lucide-react';

export function getTableIcon(type: string) {
  switch (type) {
    case 'bridal': return <Crown className="w-5 h-5 text-wedding-gold" />;
    case 'vip': return <Star className="w-5 h-5 text-amber-400" />;
    case 'regular': return <GlassWater className="w-5 h-5 text-wedding-gold/60" />;
    default: return <User className="w-5 h-5 text-slate-300" />;
  }
}

export function getTableTitle(type: string, number: string) {
  switch (type) {
    case 'bridal': return 'Bridal Table';
    case 'vip': return `VIP Table ${number}`;
    case 'regular': return `Regular Table ${number}`;
    default: return 'No Table Assigned';
  }
}
```

- [ ] **Step 2: Create the cascade-placement defaults**

Create `src/components/admin/tables/floorPlanDefaults.ts`:

```ts
import type { Table } from './types';

const COLUMNS = 4;
const CELL_WIDTH = 220;
const CELL_HEIGHT = 180;
const MARGIN = 40;

const DEFAULT_NODE_SIZE: Record<Table['type'], { width: number; height: number; shape: 'round' | 'rectangle' }> = {
  bridal: { width: 160, height: 100, shape: 'round' },
  vip: { width: 140, height: 140, shape: 'round' },
  regular: { width: 160, height: 100, shape: 'rectangle' }
};

/**
 * Cascading-grid default position for a table that has never been placed on
 * the floor-plan canvas, so it's never invisible on first render. `index` is
 * the table's position within the full active-tables list — stable enough
 * for a first-time default; collisions with manually-placed tables are not
 * avoided (explicitly out of scope, see the design spec's non-goals).
 */
export function getDefaultLayout(index: number, type: Table['type']): NonNullable<Table['layout']> {
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const { width, height, shape } = DEFAULT_NODE_SIZE[type];
  return {
    x: MARGIN + col * CELL_WIDTH,
    y: MARGIN + row * CELL_HEIGHT,
    rotation: 0,
    shape,
    width,
    height
  };
}
```

- [ ] **Step 3: Update `DroppableTable.tsx` to use the shared helpers**

Find the `lucide-react` import:

```tsx
import {
  Users,
  User,
  Crown,
  Star,
  GlassWater,
  Plus,
  Trash2,
  Search,
  UserCheck,
  UserMinus,
  AlertTriangle
} from 'lucide-react';
```

`User`, `Crown`, `Star`, and `GlassWater` are only used inside the local `getTableIcon` function you're about to delete — remove them, keeping the rest:

```tsx
import {
  Users,
  Plus,
  Trash2,
  Search,
  UserCheck,
  UserMinus,
  AlertTriangle
} from 'lucide-react';
```

Find the import block that includes `getEffectiveCapacity`/`getCapacityStatus`:

```tsx
import { getEffectiveCapacity, getCapacityStatus } from './capacity';
```

Add directly after it:

```tsx
import { getEffectiveCapacity, getCapacityStatus } from './capacity';
import { getTableIcon, getTableTitle } from './tableDisplay';
```

Find and delete the local function definitions (both are no longer needed — the imported versions are identical):

```tsx
  const getTableIcon = (type: string) => {
    switch (type) {
      case 'bridal': return <Crown className="w-5 h-5 text-wedding-gold" />;
      case 'vip': return <Star className="w-5 h-5 text-amber-400" />;
      case 'regular': return <GlassWater className="w-5 h-5 text-wedding-gold/60" />;
      default: return <User className="w-5 h-5 text-slate-300" />;
    }
  };

  const getTableTitle = (type: string, number: string) => {
    switch (type) {
      case 'bridal': return 'Bridal Table';
      case 'vip': return `VIP Table ${number}`;
      case 'regular': return `Regular Table ${number}`;
      default: return 'No Table Assigned';
    }
  };

```

Every call site (`getTableIcon(table.type)` and `getTableTitle(table.type, table.number)`) stays exactly as it is — same names, same signatures, now resolved from the import instead of a local closure.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean (in particular, confirm no "declared but never used" errors for the removed icon imports, and no "cannot find name" errors at the `getTableIcon`/`getTableTitle` call sites inside `DroppableTable.tsx`).

Run: `npm run dev`, visit `/admin/tables`, confirm the Seating List view renders every table card exactly as before — same icons, same titles — since this task changes where the logic lives, not what it does.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tables/tableDisplay.tsx src/components/admin/tables/floorPlanDefaults.ts src/components/admin/tables/DroppableTable.tsx
git commit -m "refactor: extract shared table icon/title helpers for reuse in floor-plan canvas"
```

---

## Task 4: Floor-plan node rendering + drag-to-reposition

**Files:**
- Create: `src/components/admin/tables/FloorPlanTableNode.tsx`
- Modify: `src/components/admin/tables/TableFloorPlan.tsx` (replaces the Task 2 stub)
- Modify: `src/pages/admin/AdminTables.tsx` (wire real props into `TableFloorPlan`)

**Interfaces:**
- Consumes: `getTableIcon`/`getTableTitle` from `./tableDisplay` (Task 3), `getDefaultLayout` from `./floorPlanDefaults` (Task 3), `getEffectiveCapacity` from `./capacity` (existing), `guestsByTable: Record<string, Guest[]>` (existing `AdminTables` memo, already computed).
- Produces: `FloorPlanTableNode` component and its `FloorPlanNodeData`/`FloorPlanNode` types — consumed by Task 5, which extends this same file. `TableFloorPlan` now takes props `{ tables: Table[]; guestsByTable: Record<string, Guest[]>; onUpdateLayout: (tableId: string, layout: NonNullable<Table['layout']>) => void }`.

- [ ] **Step 1: Create the custom node component**

Create `src/components/admin/tables/FloorPlanTableNode.tsx`:

```tsx
import type { Node, NodeProps } from '@xyflow/react';
import type { Table } from './types';
import { getTableIcon, getTableTitle } from './tableDisplay';

export type FloorPlanNodeData = {
  table: Table;
  occupants: number;
  capacity: number | undefined;
  onUpdateLayout: (tableId: string, layout: NonNullable<Table['layout']>) => void;
};

export type FloorPlanNode = Node<FloorPlanNodeData, 'tableNode'>;

export function FloorPlanTableNode({ data, selected }: NodeProps<FloorPlanNode>) {
  const { table, occupants, capacity } = data;
  const layout = table.layout;
  if (!layout) return null;

  return (
    <div className="relative" style={{ width: layout.width, height: layout.height }}>
      <div
        className={`w-full h-full flex flex-col items-center justify-center gap-1 border-2 bg-white shadow-sm transition-shadow ${
          layout.shape === 'round' ? 'rounded-full' : 'rounded-2xl'
        } ${selected ? 'border-wedding-gold ring-2 ring-wedding-gold/40' : 'border-slate-200'}`}
        style={{ transform: `rotate(${layout.rotation}deg)` }}
      >
        {getTableIcon(table.type)}
        <div className="text-xs font-serif text-slate-900 text-center px-2 leading-tight">
          {getTableTitle(table.type, table.number)}
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {capacity !== undefined ? `${occupants}/${capacity}` : `${occupants} · Uncapped`}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the `TableFloorPlan` stub with the real canvas**

Replace the entire contents of `src/components/admin/tables/TableFloorPlan.tsx` with:

```tsx
import { useCallback, useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import type { Node, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Guest } from '@/features/guests/types';
import type { Table } from './types';
import { getEffectiveCapacity } from './capacity';
import { getDefaultLayout } from './floorPlanDefaults';
import { FloorPlanTableNode, type FloorPlanNode } from './FloorPlanTableNode';

const nodeTypes: NodeTypes = { tableNode: FloorPlanTableNode };
const EMPTY_GUESTS: Guest[] = [];

interface TableFloorPlanProps {
  tables: Table[];
  guestsByTable: Record<string, Guest[]>;
  onUpdateLayout: (tableId: string, layout: NonNullable<Table['layout']>) => void;
}

export function TableFloorPlan({ tables, guestsByTable, onUpdateLayout }: TableFloorPlanProps) {
  // First-time placement: any table with no saved layout gets a cascading
  // default position assigned and persisted immediately, so it's never
  // invisible on the canvas.
  useEffect(() => {
    tables.forEach((table, index) => {
      if (!table.layout) {
        onUpdateLayout(table.id, getDefaultLayout(index, table.type));
      }
    });
  }, [tables, onUpdateLayout]);

  const nodes: FloorPlanNode[] = useMemo(() =>
    tables
      .filter((table): table is Table & { layout: NonNullable<Table['layout']> } => !!table.layout)
      .map(table => {
        const tableGuests = guestsByTable[table.id] ?? EMPTY_GUESTS;
        const occupants = tableGuests.filter(g => !g.is_baby_or_child).length;
        return {
          id: table.id,
          type: 'tableNode' as const,
          position: { x: table.layout.x, y: table.layout.y },
          data: {
            table,
            occupants,
            capacity: getEffectiveCapacity(table),
            onUpdateLayout
          }
        };
      })
  , [tables, guestsByTable, onUpdateLayout]);

  const handleNodeDragStop = useCallback((_event: unknown, node: Node) => {
    const table = tables.find(t => t.id === node.id);
    if (!table?.layout) return;
    onUpdateLayout(node.id, { ...table.layout, x: node.position.x, y: node.position.y });
  }, [tables, onUpdateLayout]);

  return (
    <div className="h-[70vh] rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden bg-slate-50">
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodeDragStop={handleNodeDragStop}
        nodesConnectable={false}
        fitView
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 3: Wire real props in `AdminTables.tsx`**

Find `handleUpdateCapacity`:

```tsx
  const handleUpdateCapacity = useCallback((tableId: string, capacity: number | undefined) => {
    setActiveTables(prev => {
      const updated = prev.map(t => t.id === tableId ? { ...t, capacity } : t);
      persistTableLayout(updated);
      return updated;
    });
  }, []);
```

Add a new callback directly after it, following the exact same shape:

```tsx
  const handleUpdateCapacity = useCallback((tableId: string, capacity: number | undefined) => {
    setActiveTables(prev => {
      const updated = prev.map(t => t.id === tableId ? { ...t, capacity } : t);
      persistTableLayout(updated);
      return updated;
    });
  }, []);

  const handleUpdateLayout = useCallback((tableId: string, layout: Table['layout']) => {
    setActiveTables(prev => {
      const updated = prev.map(t => t.id === tableId ? { ...t, layout } : t);
      persistTableLayout(updated);
      return updated;
    });
  }, []);
```

Find the stub usage added in Task 2:

```tsx
            <div className="hidden md:block">
              <TableFloorPlan />
            </div>
```

Replace with:

```tsx
            <div className="hidden md:block">
              <TableFloorPlan
                tables={activeTables}
                guestsByTable={guestsByTable}
                onUpdateLayout={handleUpdateLayout}
              />
            </div>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean. (If a type error appears on `onNodeDragStop`'s parameter types, see the Global Constraints note about checking `@xyflow/react`'s installed type definitions.)

Run: `npm run dev`, visit `/admin/tables`, click "Floor Plan".
- Confirm every existing table (including the always-present Bridal table) renders as a card with its icon, title, and a live `"{occupants}/{capacity}"` (or `"{occupants} · Uncapped"`) readout, laid out in a cascading grid (since none have a saved position yet).
- Confirm the occupancy count matches what the Seating List view shows for the same table.
- Drag a table node to a new position on the canvas. Reload the page, return to Floor Plan — confirm it stayed where you dropped it (persisted via `settings/table_layout`).
- Confirm the canvas's zoom/pan controls (bottom-left `Controls` buttons, and scroll-to-zoom / drag-on-empty-space-to-pan) work.
- Switch back to Seating List — confirm it's completely unaffected (same tables, same guests, same drag-and-drop).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tables/FloorPlanTableNode.tsx src/components/admin/tables/TableFloorPlan.tsx src/pages/admin/AdminTables.tsx
git commit -m "feat: render floor-plan table nodes with live occupancy and drag-to-reposition"
```

---

## Task 5: Rotation handle + shape toggle

**Files:**
- Modify: `src/components/admin/tables/FloorPlanTableNode.tsx`

**Interfaces:**
- No changes to `TableFloorPlan`'s props or `FloorPlanNodeData`'s shape — this task only adds interaction inside the node component Task 4 created.

- [ ] **Step 1: Replace `FloorPlanTableNode.tsx` with the interactive version**

Replace the entire contents of `src/components/admin/tables/FloorPlanTableNode.tsx` with:

```tsx
import { useCallback, useRef, useState } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { RotateCw, Circle, RectangleHorizontal } from 'lucide-react';
import type { Table } from './types';
import { getTableIcon, getTableTitle } from './tableDisplay';

export type FloorPlanNodeData = {
  table: Table;
  occupants: number;
  capacity: number | undefined;
  onUpdateLayout: (tableId: string, layout: NonNullable<Table['layout']>) => void;
};

export type FloorPlanNode = Node<FloorPlanNodeData, 'tableNode'>;

export function FloorPlanTableNode({ data, selected }: NodeProps<FloorPlanNode>) {
  const { table, occupants, capacity, onUpdateLayout } = data;
  const layout = table.layout;
  const nodeRef = useRef<HTMLDivElement>(null);
  const [liveRotation, setLiveRotation] = useState<number | null>(null);

  const computeAngle = useCallback((clientX: number, clientY: number) => {
    const el = nodeRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
    // atan2 measures from the positive x-axis; add 90deg so the handle's
    // resting position (straight up) reads as 0deg, then normalize to
    // [0, 360).
    const deg = (angleRad * 180) / Math.PI + 90;
    return ((deg % 360) + 360) % 360;
  }, []);

  const handleRotateStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!layout) return;

    const onPointerMove = (moveEvent: PointerEvent) => {
      setLiveRotation(computeAngle(moveEvent.clientX, moveEvent.clientY));
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      const finalDeg = Math.round(computeAngle(upEvent.clientX, upEvent.clientY));
      setLiveRotation(null);
      onUpdateLayout(table.id, { ...layout, rotation: finalDeg });
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [layout, computeAngle, onUpdateLayout, table.id]);

  if (!layout) return null;

  const displayRotation = liveRotation ?? layout.rotation;

  return (
    <div ref={nodeRef} className="relative" style={{ width: layout.width, height: layout.height }}>
      <div
        className={`w-full h-full flex flex-col items-center justify-center gap-1 border-2 bg-white shadow-sm transition-shadow ${
          layout.shape === 'round' ? 'rounded-full' : 'rounded-2xl'
        } ${selected ? 'border-wedding-gold ring-2 ring-wedding-gold/40' : 'border-slate-200'}`}
        style={{ transform: `rotate(${displayRotation}deg)` }}
      >
        {getTableIcon(table.type)}
        <div className="text-xs font-serif text-slate-900 text-center px-2 leading-tight">
          {getTableTitle(table.type, table.number)}
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {capacity !== undefined ? `${occupants}/${capacity}` : `${occupants} · Uncapped`}
        </div>
      </div>

      {selected && (
        <div
          className="nodrag absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-wedding-gold shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center"
          onPointerDown={handleRotateStart}
          title="Drag to rotate"
        >
          <RotateCw className="w-3 h-3 text-white" />
        </div>
      )}

      {selected && (
        <div className="nodrag absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1 bg-white rounded-full shadow-md p-1">
          <button
            type="button"
            onClick={() => onUpdateLayout(table.id, { ...layout, shape: 'round' })}
            className={`p-1 rounded-full transition-colors ${layout.shape === 'round' ? 'bg-wedding-gold/20 text-wedding-gold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Round table"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateLayout(table.id, { ...layout, shape: 'rectangle' })}
            className={`p-1 rounded-full transition-colors ${layout.shape === 'rectangle' ? 'bg-wedding-gold/20 text-wedding-gold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Rectangular table"
          >
            <RectangleHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
```

The `nodrag` class on both control elements is a React Flow convention: elements inside a custom node with that class don't trigger the node's own drag-to-reposition behavior, so clicking the rotate handle or a shape button doesn't also move the table.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — expect clean.

Run: `npm run dev`, visit `/admin/tables`, click "Floor Plan".
- Click a table node — confirm it gets a gold selection ring, and a small rotate handle appears above it plus two shape-toggle buttons (circle / rectangle icon) below it.
- Press and drag the rotate handle in a circle around the table — confirm the table visually rotates in real time as you drag.
- Release the drag — confirm the rotation stays at the released angle. Reload the page — confirm the rotation persisted.
- Click the rectangle shape button on a round table — confirm it immediately switches to a rounded-rectangle shape. Click the circle button — confirm it switches back. Reload — confirm the shape persisted.
- Confirm clicking and dragging the table body itself (not the handles) still repositions it, unaffected by this task (Task 4's behavior).
- Click empty canvas space — confirm the selection ring, rotate handle, and shape buttons all disappear.
- Confirm interacting with the rotate handle or shape buttons never accidentally moves the table's position.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/tables/FloorPlanTableNode.tsx
git commit -m "feat: add rotation handle and shape toggle to floor-plan table nodes"
```
