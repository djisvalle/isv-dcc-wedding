# Floor Plan Snap and Align Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add snap-to-grid (position + size), live Canva/Figma-style alignment guides while dragging, and size-matching while resizing to the floor-plan canvas.

**Architecture:** Grid snap uses `@xyflow/react`'s native `snapToGrid`/`snapGrid` props (confirmed against the installed `12.11.2` source to cover both drag and resize with zero custom snapping code) behind a toggle button. Alignment guides and size-matching are custom, since no library primitive covers object-to-object snapping — both are implemented by intercepting the `onNodesChange` pipeline `TableFloorPlan.tsx` already owns (the same mechanism verified to make live drag/resize feedback work at all), using pure geometry functions in a new `snapGuides.ts` module and a new `GuideLinesOverlay.tsx` component for rendering.

**Tech Stack:** React 18, TypeScript, `@xyflow/react` (already installed, no new dependency), Tailwind CSS.

## Global Constraints

- Zero new dependencies.
- No changes to `Table`, `Guest`, or Firestore rules — this is purely an interaction-layer feature on top of the existing `layout.x/y/width/height` fields.
- Alignment guides and size-matching are **always active** — they are not gated by the grid-snap toggle. The grid-snap toggle controls only the fixed 24px grid. When both would apply to the same axis, object-to-object alignment wins (implemented naturally: grid snapping happens inside React Flow's own pointer-position handling, before the position/dimensions ever reach the `onNodesChange` interception this plan adds — so the interception's snap, when it finds a match, simply overwrites whatever grid-snapped value arrived).
- Snap/guide threshold: 6 screen pixels, converted to flow-space units via the current zoom (`6 / zoom`) so the feel is consistent regardless of zoom level.
- No automated test framework exists in this project (no `vitest`/`jest`, no test files anywhere in `src/`). Verification is `npx tsc --noEmit` plus running the dev server and manually exercising the change at `/admin/tables` → Floor Plan tab (requires an authenticated admin session) — or a temporary, always-deleted-before-commit Playwright harness against mock data when admin credentials aren't available, matching the pattern already established throughout this feature's earlier tasks.
- Follow existing conventions: Tailwind utility classes, `lucide-react` icons, the `Button` component from `@/components/ui/button`.
- Commit after each task with a short imperative summary.

---

## Task 1: Grid snap toggle

**Files:**
- Modify: `src/components/admin/tables/TableFloorPlan.tsx`

**Interfaces:**
- No new exports — this is a self-contained addition to `TableFloorPlan`.

- [ ] **Step 1: Add imports**

Find:

```tsx
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ReactFlow, Background, Controls, useNodesState } from '@xyflow/react';
import type { Node, NodeTypes, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
```

Replace with:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, useNodesState } from '@xyflow/react';
import type { Node, NodeTypes, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Printer, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
```

- [ ] **Step 2: Add toggle state**

Find:

```tsx
export function TableFloorPlan({ tables, guestsByTable, onUpdateLayout, onAssignDefaultLayouts }: TableFloorPlanProps) {
  // First-time placement: any tables with no saved layout get a cascading
```

Replace with:

```tsx
export function TableFloorPlan({ tables, guestsByTable, onUpdateLayout, onAssignDefaultLayouts }: TableFloorPlanProps) {
  const [gridSnapEnabled, setGridSnapEnabled] = useState(false);

  // First-time placement: any tables with no saved layout get a cascading
```

- [ ] **Step 3: Add the toggle button and wire the native snap props**

Find:

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
```

Replace with:

```tsx
  return (
    <div className="h-[70vh] rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden bg-slate-50 relative">
      <div className="absolute top-3 right-3 z-10 flex gap-2 print:hidden">
        <Button
          onClick={() => setGridSnapEnabled(v => !v)}
          variant="outline"
          title={gridSnapEnabled ? 'Turn off snap to grid' : 'Turn on snap to grid'}
          className={`rounded-xl h-9 w-9 p-0 border-slate-200 ${gridSnapEnabled ? 'bg-wedding-gold/20 text-wedding-gold border-wedding-gold/40' : 'bg-white text-slate-500'}`}
        >
          <Grid3x3 className="w-4 h-4" />
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="border-slate-200 rounded-xl h-9 bg-white"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Floor Plan
        </Button>
      </div>
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
        snapToGrid={gridSnapEnabled}
        snapGrid={[24, 24]}
        fitView
      >
```

Note the `print:hidden` moved from the individual Print button onto the wrapping `<div>` — both buttons are now editing-only UI that shouldn't appear in print, same as before.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean.

Run: `npm run dev`, visit `/admin/tables` → Floor Plan tab (admin login required; if unavailable, verify via a temporary Playwright harness — see this feature's earlier tasks for the pattern, delete harness files before committing).
- Confirm a grid-icon toggle button appears to the left of "Print Floor Plan", starting in its "off" (white/gray) state.
- Click it — confirm it switches to an "on" (gold-tinted) state.
- With it on, drag a table — confirm its position jumps in visible 24px increments aligned with the background dot grid.
- With it on, resize a table via a corner handle — confirm width/height also land on 24px increments.
- Click the toggle off — confirm free positioning/resizing returns.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tables/TableFloorPlan.tsx
git commit -m "feat: add snap-to-grid toggle to the floor-plan canvas"
```

---

## Task 2: Alignment/size-matching geometry

**Files:**
- Create: `src/components/admin/tables/snapGuides.ts`

**Interfaces:**
- Produces: `computeAlignmentSnap(active: Bounds, others: Bounds[], threshold: number): AlignmentSnapResult` — consumed by Task 3.
- Produces: `computeSizeSnap(activeWidth: number, activeHeight: number, others: SizedBounds[], threshold: number): SizeSnapResult` — consumed by Task 4.
- Produces exported types: `Bounds`, `AlignmentSnapResult`, `SizedBounds`, `SizeSnapResult`.

This is a pure-logic file with no React/DOM dependency, so it can be reasoned about and verified in isolation before Task 3 wires it into the UI.

- [ ] **Step 1: Create the file**

Create `src/components/admin/tables/snapGuides.ts`:

```ts
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AlignmentSnapResult {
  x?: number;
  y?: number;
  verticalGuideX?: number;
  horizontalGuideY?: number;
}

/**
 * Compares `active`'s left/right/center edges against every `other` bound's
 * left/right/center on each axis independently, snapping to the closest
 * match within `threshold` (same units as the bounds — flow-space pixels,
 * already zoom-adjusted by the caller). Returns the snapped top-left
 * position for whichever axes matched, plus the flow-space coordinate of
 * the guide line to render for each matched axis.
 */
export function computeAlignmentSnap(active: Bounds, others: Bounds[], threshold: number): AlignmentSnapResult {
  const activeAnchorsX = [
    { value: active.x, offset: 0 },
    { value: active.x + active.width, offset: active.width },
    { value: active.x + active.width / 2, offset: active.width / 2 }
  ];
  const activeAnchorsY = [
    { value: active.y, offset: 0 },
    { value: active.y + active.height, offset: active.height },
    { value: active.y + active.height / 2, offset: active.height / 2 }
  ];

  let bestX: { diff: number; snapped: number; guide: number } | null = null;
  let bestY: { diff: number; snapped: number; guide: number } | null = null;

  for (const other of others) {
    const otherAnchorsX = [other.x, other.x + other.width, other.x + other.width / 2];
    const otherAnchorsY = [other.y, other.y + other.height, other.y + other.height / 2];

    for (const anchor of activeAnchorsX) {
      for (const otherX of otherAnchorsX) {
        const diff = Math.abs(anchor.value - otherX);
        if (diff <= threshold && (!bestX || diff < bestX.diff)) {
          bestX = { diff, snapped: otherX - anchor.offset, guide: otherX };
        }
      }
    }

    for (const anchor of activeAnchorsY) {
      for (const otherY of otherAnchorsY) {
        const diff = Math.abs(anchor.value - otherY);
        if (diff <= threshold && (!bestY || diff < bestY.diff)) {
          bestY = { diff, snapped: otherY - anchor.offset, guide: otherY };
        }
      }
    }
  }

  return {
    x: bestX?.snapped,
    y: bestY?.snapped,
    verticalGuideX: bestX?.guide,
    horizontalGuideY: bestY?.guide
  };
}

export interface SizedBounds {
  id: string;
  width: number;
  height: number;
}

export interface SizeSnapResult {
  width?: number;
  height?: number;
  matchedWidthId?: string;
  matchedHeightId?: string;
}

/**
 * Compares an in-progress resize's width/height independently against
 * every other table's width/height, snapping each dimension to the closest
 * match within `threshold`. Width and height can match different tables.
 */
export function computeSizeSnap(
  activeWidth: number,
  activeHeight: number,
  others: SizedBounds[],
  threshold: number
): SizeSnapResult {
  let bestWidth: { diff: number; width: number; id: string } | null = null;
  let bestHeight: { diff: number; height: number; id: string } | null = null;

  for (const other of others) {
    const widthDiff = Math.abs(activeWidth - other.width);
    if (widthDiff <= threshold && (!bestWidth || widthDiff < bestWidth.diff)) {
      bestWidth = { diff: widthDiff, width: other.width, id: other.id };
    }

    const heightDiff = Math.abs(activeHeight - other.height);
    if (heightDiff <= threshold && (!bestHeight || heightDiff < bestHeight.diff)) {
      bestHeight = { diff: heightDiff, height: other.height, id: other.id };
    }
  }

  return {
    width: bestWidth?.width,
    height: bestHeight?.height,
    matchedWidthId: bestWidth?.id,
    matchedHeightId: bestHeight?.id
  };
}
```

- [ ] **Step 2: Verify types and trace one concrete example by hand**

Run: `npx tsc --noEmit` — expect clean.

Trace `computeAlignmentSnap` against this concrete case (no code execution needed — this is a desk-check of the logic, since this file has no test runner to execute it standalone; Task 3 exercises it live in the browser):

- `active = { x: 100, y: 100, width: 50, height: 50 }` (so its right edge is at x=150, its center is at x=125)
- `others = [{ x: 200, y: 300, width: 50, height: 50 }]` (this other box's left edge is at x=200)
- `threshold = 10`

Expected: `active`'s right edge (150) vs `other`'s left edge (200) → diff 50, over threshold, no match on that pairing. No other X pairing is within 10 either (e.g. active's left edge 100 vs other's left 200 = diff 100; active's center 125 vs other's left 200 = diff 75). So `computeAlignmentSnap` should return `x: undefined, verticalGuideX: undefined`. Confirm by reading through the loop logic that this is indeed what it produces (every diff exceeds 10, so `bestX` stays `null` throughout, and `bestX?.snapped` is `undefined`).

Now trace a case that SHOULD match: same `active`, but `others = [{ x: 145, y: 300, width: 50, height: 50 }]` (this other box's left edge is at x=145). `active`'s right edge (150) vs `other`'s left edge (145) → diff 5, within threshold 10. Expected: `x` snaps so that `active`'s right edge lands exactly on 145, i.e. `x: 145 - 50 = 95`, and `verticalGuideX: 145`. Confirm the code's `anchor.offset` for the right-edge anchor is `active.width` (50), so `snapped = otherX - anchor.offset = 145 - 50 = 95` — matches.

If either trace doesn't match what the code actually does, there's a bug — fix it before proceeding (re-check the anchor/offset pairing logic).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/tables/snapGuides.ts
git commit -m "feat: add pure alignment and size-matching geometry for the floor plan"
```

---

## Task 3: Live alignment guides while dragging

**Files:**
- Create: `src/components/admin/tables/GuideLinesOverlay.tsx`
- Modify: `src/components/admin/tables/TableFloorPlan.tsx`

**Interfaces:**
- Consumes: `computeAlignmentSnap`, `Bounds` from `./snapGuides` (Task 2).
- Produces: `GuideLinesOverlay` component, props `{ verticalGuideX?: number; horizontalGuideY?: number }`.

- [ ] **Step 1: Create the guide-line overlay component**

Create `src/components/admin/tables/GuideLinesOverlay.tsx`:

```tsx
import { useStore } from '@xyflow/react';

interface GuideLinesOverlayProps {
  verticalGuideX?: number;
  horizontalGuideY?: number;
}

/**
 * Renders Canva/Figma-style alignment guide lines in flow space, following
 * pan/zoom manually. Children of <ReactFlow> render outside its internal
 * viewport transform (confirmed while building this page's Print button),
 * so this component computes the same translate+scale transform React Flow
 * applies internally — the same technique its own <Background> component
 * uses to stay pannable/zoomable.
 */
export function GuideLinesOverlay({ verticalGuideX, horizontalGuideY }: GuideLinesOverlayProps) {
  const transform = useStore(state => state.transform);

  if (verticalGuideX === undefined && horizontalGuideY === undefined) return null;

  const [tx, ty, zoom] = transform;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden nopan nodrag print:hidden" style={{ zIndex: 5 }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${tx}px, ${ty}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        {verticalGuideX !== undefined && (
          <div className="absolute bg-sky-500" style={{ left: verticalGuideX, top: -10000, width: 1, height: 20000 }} />
        )}
        {horizontalGuideY !== undefined && (
          <div className="absolute bg-sky-500" style={{ top: horizontalGuideY, left: -10000, height: 1, width: 20000 }} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update imports in `TableFloorPlan.tsx`**

Find:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, useNodesState } from '@xyflow/react';
import type { Node, NodeTypes, ReactFlowInstance } from '@xyflow/react';
```

Replace with:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useStoreApi } from '@xyflow/react';
import type { Node, NodeChange, NodeTypes, ReactFlowInstance } from '@xyflow/react';
```

Find:

```tsx
import { FloorPlanTableNode, type FloorPlanNode } from './FloorPlanTableNode';
```

Replace with:

```tsx
import { FloorPlanTableNode, type FloorPlanNode } from './FloorPlanTableNode';
import { computeAlignmentSnap, type Bounds } from './snapGuides';
import { GuideLinesOverlay } from './GuideLinesOverlay';
```

- [ ] **Step 3: Add guide state and the store handle**

Find:

```tsx
  const [nodes, setNodes, onNodesChange] = useNodesState<FloorPlanNode>(derivedNodes);

  // Track which node ids are mid-drag so the reconciliation effect below
  // doesn't stomp on an in-flight drag position with a stale derived one.
  const draggingNodeIds = useRef<Set<string>>(new Set());
```

Replace with:

```tsx
  const [nodes, setNodes, onNodesChange] = useNodesState<FloorPlanNode>(derivedNodes);

  const storeApi = useStoreApi();
  const [guideState, setGuideState] = useState<{ verticalGuideX?: number; horizontalGuideY?: number; matchedTableId?: string } | null>(null);

  // Track which node ids are mid-drag so the reconciliation effect below
  // doesn't stomp on an in-flight drag position with a stale derived one.
  const draggingNodeIds = useRef<Set<string>>(new Set());
```

- [ ] **Step 4: Clear guides on drag end, add the `onNodesChange` interception**

Find:

```tsx
  const handleNodeDragStop = useCallback((_event: unknown, node: Node) => {
    draggingNodeIds.current.delete(node.id);
    const table = tables.find(t => t.id === node.id);
    if (!table?.layout) return;
    onUpdateLayout(node.id, { ...table.layout, x: node.position.x, y: node.position.y });
  }, [tables, onUpdateLayout]);

  const reactFlowInstanceRef = useRef<ReactFlowInstance<FloorPlanNode> | null>(null);
```

Replace with:

```tsx
  const handleNodeDragStop = useCallback((_event: unknown, node: Node) => {
    draggingNodeIds.current.delete(node.id);
    setGuideState(null);
    const table = tables.find(t => t.id === node.id);
    if (!table?.layout) return;
    onUpdateLayout(node.id, { ...table.layout, x: node.position.x, y: node.position.y });
  }, [tables, onUpdateLayout]);

  const SNAP_THRESHOLD_SCREEN_PX = 6;

  // Intercepts the same onNodesChange pipeline that already makes live
  // drag/resize feedback possible (see the useNodesState comment above) to
  // add Canva/Figma-style alignment: while a position change is mid-drag,
  // compare the dragged table's edges/center against every other table's on
  // each axis independently, snap to the closest match within threshold,
  // and record the matched coordinate so GuideLinesOverlay can draw it.
  const handleNodesChange = useCallback((changes: NodeChange<FloorPlanNode>[]) => {
    const zoom = storeApi.getState().transform[2];
    const threshold = SNAP_THRESHOLD_SCREEN_PX / zoom;

    const adjusted = changes.map(change => {
      if (change.type === 'position' && change.dragging && change.position) {
        const activeTable = tables.find(t => t.id === change.id);
        if (!activeTable?.layout) return change;

        const active: Bounds = {
          x: change.position.x,
          y: change.position.y,
          width: activeTable.layout.width,
          height: activeTable.layout.height
        };
        const others: Bounds[] = tables
          .filter(t => t.id !== change.id && t.layout)
          .map(t => ({ x: t.layout!.x, y: t.layout!.y, width: t.layout!.width, height: t.layout!.height }));

        const snap = computeAlignmentSnap(active, others, threshold);
        setGuideState({ verticalGuideX: snap.verticalGuideX, horizontalGuideY: snap.horizontalGuideY });

        if (snap.x === undefined && snap.y === undefined) return change;
        return {
          ...change,
          position: {
            x: snap.x ?? change.position.x,
            y: snap.y ?? change.position.y
          }
        };
      }

      return change;
    });

    onNodesChange(adjusted);
  }, [tables, onNodesChange, storeApi]);

  const reactFlowInstanceRef = useRef<ReactFlowInstance<FloorPlanNode> | null>(null);
```

- [ ] **Step 5: Wire the interception into `<ReactFlow>` and render the overlay**

Find:

```tsx
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
        snapToGrid={gridSnapEnabled}
        snapGrid={[24, 24]}
        fitView
      >
        <Background gap={24} className="print:hidden" />
```

Replace with:

```tsx
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onInit={(instance) => { reactFlowInstanceRef.current = instance; }}
        nodesConnectable={false}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        snapToGrid={gridSnapEnabled}
        snapGrid={[24, 24]}
        fitView
      >
        <GuideLinesOverlay verticalGuideX={guideState?.verticalGuideX} horizontalGuideY={guideState?.horizontalGuideY} />
        <Background gap={24} className="print:hidden" />
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — expect clean.

Run: `npm run dev`, visit `/admin/tables` → Floor Plan tab, place at least two tables where you can see both.
- Drag one table until an edge or its center gets close to another table's edge/center — confirm a thin blue line appears at the matched coordinate and the dragged table's position snaps to align exactly.
- Confirm the line only appears on the axis that actually matched (e.g. only a vertical line if only the X-axis aligned).
- Release the drag — confirm the line disappears.
- Drag a table somewhere with no nearby tables — confirm no line ever appears and positioning stays free.
- Pan/zoom the canvas, then repeat the alignment drag — confirm the guide line still renders at the visually correct position (this is the part most worth double-checking, since it's the one piece of this task with no direct precedent elsewhere in the codebase).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/tables/GuideLinesOverlay.tsx src/components/admin/tables/TableFloorPlan.tsx
git commit -m "feat: add live alignment guides while dragging floor-plan tables"
```

---

## Task 4: Size matching while resizing

**Files:**
- Modify: `src/components/admin/tables/TableFloorPlan.tsx`
- Modify: `src/components/admin/tables/FloorPlanTableNode.tsx`

**Interfaces:**
- Consumes: `computeSizeSnap` from `./snapGuides` (Task 2).
- `FloorPlanNodeData` gains an optional field: `isSizeMatchTarget?: boolean`.

- [ ] **Step 1: Import `computeSizeSnap`**

In `src/components/admin/tables/TableFloorPlan.tsx`, find:

```tsx
import { computeAlignmentSnap, type Bounds } from './snapGuides';
```

Replace with:

```tsx
import { computeAlignmentSnap, computeSizeSnap, type Bounds } from './snapGuides';
```

- [ ] **Step 2: Extend `handleNodesChange` to handle resize dimension changes**

Find:

```tsx
        if (snap.x === undefined && snap.y === undefined) return change;
        return {
          ...change,
          position: {
            x: snap.x ?? change.position.x,
            y: snap.y ?? change.position.y
          }
        };
      }

      return change;
    });

    onNodesChange(adjusted);
  }, [tables, onNodesChange, storeApi]);
```

Replace with:

```tsx
        if (snap.x === undefined && snap.y === undefined) return change;
        return {
          ...change,
          position: {
            x: snap.x ?? change.position.x,
            y: snap.y ?? change.position.y
          }
        };
      }

      if (change.type === 'dimensions' && change.resizing && change.dimensions) {
        const others = tables
          .filter(t => t.id !== change.id && t.layout)
          .map(t => ({ id: t.id, width: t.layout!.width, height: t.layout!.height }));

        const snap = computeSizeSnap(change.dimensions.width, change.dimensions.height, others, threshold);
        setGuideState({ matchedTableId: snap.matchedWidthId ?? snap.matchedHeightId });

        if (snap.width === undefined && snap.height === undefined) return change;
        return {
          ...change,
          dimensions: {
            width: snap.width ?? change.dimensions.width,
            height: snap.height ?? change.dimensions.height
          }
        };
      }

      if (change.type === 'dimensions' && !change.resizing) {
        setGuideState(null);
      }

      return change;
    });

    onNodesChange(adjusted);
  }, [tables, onNodesChange, storeApi]);
```

The `!change.resizing` cleanup branch relies on `@xyflow/react`'s `NodeResizeControl` emitting a final `{ type: 'dimensions', resizing: false, dimensions: {...} }` change when a resize ends (confirmed directly in the installed package's source, in the same `onEnd` callback this feature's earlier resize work already relies on for committing the final size) — so this fires reliably through the same pipeline, without needing to reach into `FloorPlanTableNode.tsx`'s resize-end handler.

- [ ] **Step 3: Render the size-match highlight**

Find:

```tsx
  return (
    <div className="h-[70vh] rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden bg-slate-50 relative">
```

Replace with:

```tsx
  const nodesForRender = useMemo(() =>
    nodes.map(n => ({ ...n, data: { ...n.data, isSizeMatchTarget: n.id === guideState?.matchedTableId } }))
  , [nodes, guideState?.matchedTableId]);

  return (
    <div className="h-[70vh] rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden bg-slate-50 relative">
```

Find:

```tsx
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
```

Replace with:

```tsx
      <ReactFlow
        nodes={nodesForRender}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
```

- [ ] **Step 4: Consume the highlight flag in `FloorPlanTableNode.tsx`**

Find:

```tsx
export type FloorPlanNodeData = {
  table: Table;
  occupants: number;
  capacity: number | undefined;
  onUpdateLayout: (tableId: string, layout: NonNullable<Table['layout']>) => void;
};
```

Replace with:

```tsx
export type FloorPlanNodeData = {
  table: Table;
  occupants: number;
  capacity: number | undefined;
  onUpdateLayout: (tableId: string, layout: NonNullable<Table['layout']>) => void;
  isSizeMatchTarget?: boolean;
};
```

Find:

```tsx
export function FloorPlanTableNode({ data, selected, width, height }: NodeProps<FloorPlanNode>) {
  const { table, occupants, capacity, onUpdateLayout } = data;
```

Replace with:

```tsx
export function FloorPlanTableNode({ data, selected, width, height }: NodeProps<FloorPlanNode>) {
  const { table, occupants, capacity, onUpdateLayout, isSizeMatchTarget } = data;
```

Find:

```tsx
        className={`w-full h-full flex flex-col items-center justify-center gap-1 border-2 bg-white shadow-sm transition-shadow ${
          isElliptical ? 'rounded-full' : 'rounded-2xl'
        } ${selected ? 'border-wedding-gold ring-2 ring-wedding-gold/40' : 'border-slate-200'}`}
```

Replace with:

```tsx
        className={`w-full h-full flex flex-col items-center justify-center gap-1 border-2 bg-white shadow-sm transition-shadow ${
          isElliptical ? 'rounded-full' : 'rounded-2xl'
        } ${
          selected
            ? 'border-wedding-gold ring-2 ring-wedding-gold/40'
            : isSizeMatchTarget
              ? 'border-sky-400 ring-2 ring-sky-300/50'
              : 'border-slate-200'
        }`}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` — expect clean.

Run: `npm run dev`, visit `/admin/tables` → Floor Plan tab, place at least two tables of different sizes.
- Resize one table until its width or height gets close to another table's matching dimension — confirm it snaps to match exactly, and the OTHER (matched) table gets a thin blue ring while the resize is in progress.
- Release the resize — confirm the blue ring disappears from the matched table and the resized table keeps the matched size.
- Confirm width and height can match different tables independently (resize a table so its width matches table A and its height matches table B — both should snap, each showing its own guide feedback correctly even though the visual ring only tracks one `matchedTableId` at a time — verify this is at least not visually broken, e.g. no ring flicker or wrong table highlighted, even if only one match is visually indicated at once).
- Confirm the gold selection ring still takes priority in appearance if a table is somehow both selected and a size-match target (shouldn't normally co-occur since the actively-resized table is the selected one and the target is a different table, but the className logic should still make sense if it ever does).
- Confirm dragging (Task 3) and grid snap (Task 1) still both work unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/tables/TableFloorPlan.tsx src/components/admin/tables/FloorPlanTableNode.tsx
git commit -m "feat: add size-matching with visual highlight while resizing floor-plan tables"
```
