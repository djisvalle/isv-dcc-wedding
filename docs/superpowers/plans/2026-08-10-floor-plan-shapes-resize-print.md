# Floor Plan Shapes, Resize, and Print Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the floor-plan canvas's table shapes from round/rectangle to round/oval/square/rectangle, add on-canvas resizing via drag handles, and add a dedicated "Print Floor Plan" action.

**Architecture:** All three features live entirely inside the existing floor-plan canvas components (`FloorPlanTableNode.tsx`, `TableFloorPlan.tsx`, `floorPlanDefaults.ts`, `types.ts`) — no changes to `AdminTables.tsx` are needed, since `onUpdateLayout` is already threaded down to the node component from earlier work. Resizing uses `@xyflow/react`'s built-in `NodeResizeControl` (already available — no new dependency) rather than hand-rolled pointer math. Printing reuses the browser's native print, matching the existing "Print Seating Chart" convention.

**Tech Stack:** React 18, TypeScript, `@xyflow/react` (React Flow, already installed — no new dependency this plan), Tailwind CSS, `lucide-react`.

## Global Constraints

- This plan introduces **zero new dependencies** — resizing uses `@xyflow/react`'s existing `NodeResizeControl`, printing uses the browser's native `window.print()` (no `html-to-image` or similar).
- No changes to the `Guest` interface or Firestore security rules. `Table['layout']['shape']` widens from `'round' | 'rectangle'` to a 4-value union — additive and backward-compatible with any already-persisted `'round'`/`'rectangle'` values.
- No changes to `AdminTables.tsx` are anticipated by this plan — if a task discovers one is genuinely needed, treat that as a signal to stop and reconsider rather than assuming it's fine.
- All shapes resize freely in both dimensions — no aspect-ratio locking on any shape (explicit design decision).
- Resize minimum: 60×60px. No maximum.
- No automated test framework exists in this project (no `vitest`/`jest`, no test files anywhere in `src/`). Every task is verified by running the dev server (`npm run dev`, default `http://localhost:3000`) and manually exercising the change at `/admin/tables` → Floor Plan tab (requires an authenticated admin session).
- `@xyflow/react`'s public TypeScript type/export names referenced in this plan (`NodeResizeControl`, `ReactFlowInstance`, etc.) are based on the installed `12.11.2` API surface. If `npx tsc --noEmit` reports a mismatch, check `node_modules/@xyflow/react/dist/esm/` for the current name — the runtime behavior described is what matters, not the exact spelling.
- Follow existing conventions: Tailwind utility classes only, icons from `lucide-react`, the `Button` component from `@/components/ui/button` for any new buttons (matching how "Print Seating Chart" is already built), the `nodrag` class on any new interactive control inside a node (so it doesn't trigger the node's own drag-to-reposition).
- Commit after each task with a short imperative summary.

---

## Task 1: Shape system — round, oval, square, rectangle

**Files:**
- Modify: `src/components/admin/tables/types.ts`
- Modify: `src/components/admin/tables/floorPlanDefaults.ts`
- Modify: `src/components/admin/tables/FloorPlanTableNode.tsx`

**Interfaces:**
- Produces: `export type TableShape = 'round' | 'oval' | 'square' | 'rectangle';` (in `types.ts`) — consumed by Tasks 2 and 3 only incidentally (neither touches shape directly), but consumed by this task's own files.
- Produces: `export const SHAPE_DEFAULT_SIZE: Record<TableShape, { width: number; height: number }>` (in `floorPlanDefaults.ts`).

- [ ] **Step 1: Add the `TableShape` type and widen `Table['layout']['shape']`**

In `src/components/admin/tables/types.ts`, find:

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

Replace with:

```ts
export type TableShape = 'round' | 'oval' | 'square' | 'rectangle';

export interface Table {
  id: string; // key: type-number
  type: 'bridal' | 'vip' | 'regular';
  number: string;
  capacity?: number; // undefined = uncapped
  layout?: {
    x: number;
    y: number;
    rotation: number; // degrees, 0-359
    shape: TableShape;
    width: number;
    height: number;
  };
}
```

- [ ] **Step 2: Add `SHAPE_DEFAULT_SIZE` and widen `DEFAULT_NODE_SIZE`'s type**

In `src/components/admin/tables/floorPlanDefaults.ts`, find:

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
```

Replace with (this only widens the type annotation — the actual per-table-type default values are unchanged, still `'round'`/`'rectangle'`, since first-time cascade placement isn't part of this feature):

```ts
import type { Table, TableShape } from './types';

const COLUMNS = 4;
const CELL_WIDTH = 220;
const CELL_HEIGHT = 180;
const MARGIN = 40;

const DEFAULT_NODE_SIZE: Record<Table['type'], { width: number; height: number; shape: TableShape }> = {
  bridal: { width: 160, height: 100, shape: 'round' },
  vip: { width: 140, height: 140, shape: 'round' },
  regular: { width: 160, height: 100, shape: 'rectangle' }
};

/**
 * Default dimensions a table resets to when the shape toggle picks a new
 * shape — separate from `DEFAULT_NODE_SIZE` above, which only governs
 * first-time cascade placement by table *type* (bridal/vip/regular), not by
 * shape. Since resizing is free in both dimensions with no aspect lock, a
 * shape's rendering family (elliptical vs. boxed corners) is permanent but
 * its proportions aren't — this map is only a starting point.
 */
export const SHAPE_DEFAULT_SIZE: Record<TableShape, { width: number; height: number }> = {
  round: { width: 140, height: 140 },
  oval: { width: 200, height: 110 },
  square: { width: 140, height: 140 },
  rectangle: { width: 180, height: 100 }
};
```

- [ ] **Step 3: Update `FloorPlanTableNode.tsx`'s rendering to use the elliptical/boxed family split**

Find:

```tsx
import { useCallback, useRef, useState } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { RotateCw, Circle, RectangleHorizontal } from 'lucide-react';
import type { Table } from './types';
import { getTableIcon, getTableTitle } from './tableDisplay';
```

Replace with:

```tsx
import { useCallback, useRef, useState } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { RotateCw, Circle, Square, RectangleHorizontal } from 'lucide-react';
import type { Table } from './types';
import { getTableIcon, getTableTitle } from './tableDisplay';
import { SHAPE_DEFAULT_SIZE } from './floorPlanDefaults';
```

Find:

```tsx
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
```

Replace with:

```tsx
  if (!layout) return null;

  const displayRotation = liveRotation ?? layout.rotation;
  const isElliptical = layout.shape === 'round' || layout.shape === 'oval';

  return (
    <div ref={nodeRef} className="relative" style={{ width: layout.width, height: layout.height }}>
      <div
        className={`w-full h-full flex flex-col items-center justify-center gap-1 border-2 bg-white shadow-sm transition-shadow ${
          isElliptical ? 'rounded-full' : 'rounded-2xl'
        } ${selected ? 'border-wedding-gold ring-2 ring-wedding-gold/40' : 'border-slate-200'}`}
        style={{ transform: `rotate(${displayRotation}deg)` }}
      >
```

- [ ] **Step 4: Replace the 2-button shape toggle with a 2×2 grid of 4**

Find:

```tsx
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
```

Replace with:

```tsx
      {selected && (
        <div className="nodrag absolute -bottom-9 left-1/2 -translate-x-1/2 grid grid-cols-2 gap-1 bg-white rounded-2xl shadow-md p-1">
          <button
            type="button"
            onClick={() => onUpdateLayout(table.id, { ...layout, shape: 'round', ...SHAPE_DEFAULT_SIZE.round })}
            className={`p-1 rounded-full transition-colors ${layout.shape === 'round' ? 'bg-wedding-gold/20 text-wedding-gold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Round table"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateLayout(table.id, { ...layout, shape: 'oval', ...SHAPE_DEFAULT_SIZE.oval })}
            className={`p-1 rounded-full transition-colors ${layout.shape === 'oval' ? 'bg-wedding-gold/20 text-wedding-gold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Oval table"
          >
            <span className="block w-3.5 h-2.5 rounded-full border-2 border-current" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateLayout(table.id, { ...layout, shape: 'square', ...SHAPE_DEFAULT_SIZE.square })}
            className={`p-1 rounded-full transition-colors ${layout.shape === 'square' ? 'bg-wedding-gold/20 text-wedding-gold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Square table"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateLayout(table.id, { ...layout, shape: 'rectangle', ...SHAPE_DEFAULT_SIZE.rectangle })}
            className={`p-1 rounded-full transition-colors ${layout.shape === 'rectangle' ? 'bg-wedding-gold/20 text-wedding-gold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Rectangular table"
          >
            <RectangleHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
```

Note the offset changed from `-bottom-8` to `-bottom-9` to give the now-taller 2-row grid a hair more clearance from the table — a minor cosmetic adjustment, not load-bearing.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` — expect clean.

Run: `npm run dev`, visit `/admin/tables` → Floor Plan tab (admin login required).
- Select a table — confirm the shape control below it now shows 4 icons in a 2×2 grid: circle (round), a small pill/ellipse shape (oval), square, and horizontal rectangle.
- Click each one in turn — confirm the table's corner style switches correctly (round/oval → fully rounded; square/rectangle → boxed corners) and its size resets to that shape's preset (round/square small squarish, oval wider-than-tall, rectangle wider-than-tall boxed).
- Reload the page — confirm the last-picked shape and its dimensions persisted.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/tables/types.ts src/components/admin/tables/floorPlanDefaults.ts src/components/admin/tables/FloorPlanTableNode.tsx
git commit -m "feat: add oval and square table shapes to the floor plan"
```

---

## Task 2: On-canvas resizing

**Files:**
- Modify: `src/components/admin/tables/FloorPlanTableNode.tsx`

**Interfaces:**
- No new props on `FloorPlanTableNode` or `TableFloorPlan` — resizing reuses the same `onUpdateLayout` callback already threaded through `data`.

This is the most novel integration in this plan: `@xyflow/react`'s `NodeResizeControl` is a real, documented building block (confirmed present in the installed `12.11.2` package at `node_modules/@xyflow/react/dist/esm/additional-components/NodeResizer/NodeResizeControl.d.ts`), but exactly how it visually resizes the DOM during a live drag (versus how it's reported to your code) is worth confirming empirically rather than assuming from the type signatures alone — see the verification note in Step 3.

- [ ] **Step 1: Import `NodeResizeControl`**

In `src/components/admin/tables/FloorPlanTableNode.tsx`, find:

```tsx
import { useCallback, useRef, useState } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
```

Replace with:

```tsx
import { useCallback, useRef, useState } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { NodeResizeControl } from '@xyflow/react';
```

- [ ] **Step 2: Add the resize-commit handler**

Find `handleRotateStart`'s closing (the `}, [layout, computeAngle, onUpdateLayout, table.id]);` line that ends that `useCallback`). Add a new callback directly after it:

```tsx
  const handleResizeEnd = useCallback((_event: unknown, params: { x: number; y: number; width: number; height: number }) => {
    if (!layout) return;
    onUpdateLayout(table.id, { ...layout, x: params.x, y: params.y, width: params.width, height: params.height });
  }, [layout, onUpdateLayout, table.id]);
```

`params` carries the resize's final `x`/`y`/`width`/`height` — `x`/`y` change too because resizing from a top or left handle moves the node's origin so the opposite corner stays fixed, exactly like resizing a window from its top-left corner. Committing all four together keeps the table anchored correctly regardless of which corner was dragged.

- [ ] **Step 3: Add the four corner resize handles**

Find the shape-toggle block you just finished in Task 1 (the `{selected && (<div className="nodrag absolute -bottom-9 ...">` block with the 4 shape buttons) — its closing `)}` is the last thing before the two closing `</div>` tags that end the component's `return`. Add the resize handles directly after that shape-toggle block's closing `)}`, still inside the outer wrapper `<div ref={nodeRef} ...>`:

```tsx
      {selected && (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(position => (
        <NodeResizeControl
          key={position}
          position={position}
          minWidth={60}
          minHeight={60}
          onResizeEnd={handleResizeEnd}
          className="nodrag !bg-wedding-gold !border-2 !border-white"
          style={{ width: 10, height: 10, borderRadius: 2 }}
        />
      ))}
```

`nodeId` is intentionally omitted — per the library's own type comment, it's "optional if used inside custom node" and auto-detects the node it's rendered inside. `variant` is intentionally omitted too — it defaults to `"handle"` (a visible square control), which combined with only requesting the four corner `position`s (not the edge positions like `'top'`/`'left'`) is what gives exactly 4 corner-only handles with no edge-drag lines, matching the earlier design decision.

- [ ] **Step 4: Verify — pay close attention to live visual feedback**

Run: `npx tsc --noEmit` — expect clean.

Run: `npm run dev`, visit `/admin/tables` → Floor Plan tab.
- Select a table — confirm 4 small square handles appear at its corners (in addition to the existing rotate handle above and shape toggle below).
- Drag one corner handle. **Specifically check whether the table visually grows/shrinks in real time as you drag, not just at release.** This is the one behavior that can't be fully predicted from the type signatures alone.
  - **If live resize feedback works as expected:** great, proceed to the remaining checks below.
  - **If the table's visual size does NOT change until you release the drag** (e.g., only the small handle square moves, or nothing visibly happens until pointer-up): this means `NodeResizeControl` is resizing React Flow's own internal node dimensions rather than the `layout.width`/`layout.height`-driven inline style on this component's outer `<div ref={nodeRef} style={{ width: layout.width, height: layout.height }}>` wrapper. In that case, check `node_modules/@xyflow/react`'s bundled source (search for how `NodeResizer`'s own usage examples structure the node they wrap, or search `node_modules/@xyflow/system/dist/esm/xyresizer` for how it identifies and mutates the target element) and adjust the wrapper so its size is driven by whatever React Flow considers "the node's measured dimensions" during the drag, instead of (or in addition to) the `layout.width`/`layout.height` props. The end behavior that matters, regardless of exact mechanism: the table visibly grows/shrinks smoothly while dragging, and `handleResizeEnd` fires exactly once on release with the final dimensions.
- After releasing a drag, reload the page — confirm the new width/height/position persisted.
- Try dragging a corner handle to make the table smaller than 60×60 — confirm it stops shrinking at that floor rather than continuing.
- Confirm dragging the table's body (not a handle) still repositions it as before, and dragging a resize handle does NOT also reposition the table.
- Resize a `round` table non-uniformly (e.g. much wider than tall) — confirm it visually reads as an ellipse (expected — this is the "shapes are starting points" behavior from the design, not a bug).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tables/FloorPlanTableNode.tsx
git commit -m "feat: add on-canvas resizing to floor-plan tables via corner handles"
```

---

## Task 3: Print Floor Plan

**Files:**
- Modify: `src/components/admin/tables/TableFloorPlan.tsx`

**Interfaces:**
- No new props — this is a self-contained addition to `TableFloorPlan`.

- [ ] **Step 1: Import what's needed**

Find:

```tsx
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ReactFlow, Background, Controls, useNodesState } from '@xyflow/react';
import type { Node, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

Replace with:

```tsx
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ReactFlow, Background, Controls, useNodesState } from '@xyflow/react';
import type { Node, NodeTypes, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
```

- [ ] **Step 2: Capture the React Flow instance and add the print handler**

Find `handleNodeDragStop`'s closing (the `}, [tables, onUpdateLayout]);` line that ends that `useCallback`). Add directly after it:

```tsx
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  const handlePrint = useCallback(() => {
    reactFlowInstanceRef.current?.fitView({ duration: 0 });
    // Two animation frames give the fit-view's layout change time to paint
    // before the print dialog captures the DOM — a single frame is
    // sometimes too early in some browsers.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }, []);
```

- [ ] **Step 3: Add the print button and wire up `onInit`, hide Controls/Background from print**

Find:

```tsx
  return (
    <div className="h-[70vh] rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden bg-slate-50">
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        nodesConnectable={false}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        fitView
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
```

Replace with:

```tsx
  return (
    <div className="h-[70vh] rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden bg-slate-50 relative">
      <Button
        onClick={handlePrint}
        variant="outline"
        className="absolute top-3 right-3 z-10 border-slate-200 rounded-xl h-9 bg-white print:hidden"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print Floor Plan
      </Button>
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onInit={(instance) => { reactFlowInstanceRef.current = instance; }}
        nodesConnectable={false}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        fitView
      >
        <Background gap={24} className="print:hidden" />
        <Controls showInteractive={false} className="print:hidden" />
      </ReactFlow>
    </div>
  );
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean.

Run: `npm run dev`, visit `/admin/tables` → Floor Plan tab.
- Confirm a "Print Floor Plan" button appears in the top-right corner of the canvas.
- Pan/zoom away from the default view (drag the canvas, zoom out), place a couple of tables far apart, then click "Print Floor Plan" — confirm the view snaps to fit every table in frame just before the print dialog opens (you should see the fit-to-view happen, then the browser's print preview).
- In the print preview, confirm the zoom `Controls` buttons and the dotted `Background` grid are not visible, but the tables themselves are.
- Confirm the button itself does not appear in the print preview (it's `print:hidden`).
- Switch to the Seating List tab and confirm "Print Seating Chart" still works exactly as before, and that "Print Floor Plan" is not visible there (it only exists inside the Floor Plan canvas component, which isn't mounted on that tab).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tables/TableFloorPlan.tsx
git commit -m "feat: add Print Floor Plan action to the floor-plan canvas"
```
