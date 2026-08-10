# Floor Plan: More Shapes, Resizing, and Print

## Context

The floor-plan canvas (`src/components/admin/tables/TableFloorPlan.tsx` + `FloorPlanTableNode.tsx`, built on `@xyflow/react`) currently supports two table shapes (round, rectangle) and rotation, but fixed per-type dimensions and no print output of its own — printing is limited to the Seating List view's grid. This spec adds two more shapes, on-canvas resizing, and a dedicated "Print Floor Plan" action.

## Goals

1. Expand table shapes from round/rectangle to round/oval/square/rectangle.
2. Let a selected table be resized directly on the canvas, not just repositioned/rotated.
3. Add a "Print Floor Plan" action that prints the canvas layout itself (distinct from the existing "Print Seating Chart", which prints the guest-list grid).

## 1. Shape system

**Data model:** `types.ts` gains an exported `TableShape` type, and `Table['layout']['shape']` is retyped to use it:

```ts
export type TableShape = 'round' | 'oval' | 'square' | 'rectangle';
```

**Rendering families:** two CSS treatments cover all four shapes — `round`/`oval` render with full corner rounding (`rounded-full`, which yields a true ellipse for any non-square width×height, not just a circle), and `square`/`rectangle` render with modest corner rounding (`rounded-2xl`, a box). `FloorPlanTableNode` picks the family from `layout.shape`.

**Shapes are starting points, not permanent constraints.** Per the earlier discussion: since resizing (§2) is free in both dimensions with no aspect-ratio lock, a shape's *rendering family* is fixed (elliptical vs. boxed) but its *proportions* are not — a `round` table resized non-uniformly renders exactly like `oval` would, and `square` resized non-uniformly renders like `rectangle`. The shape toggle's job is therefore: (a) pick the corner-rounding family, and (b) reset the table to that shape's preset dimensions. A new shared preset map in `floorPlanDefaults.ts`:

```ts
export const SHAPE_DEFAULT_SIZE: Record<TableShape, { width: number; height: number }> = {
  round: { width: 140, height: 140 },
  oval: { width: 200, height: 110 },
  square: { width: 140, height: 140 },
  rectangle: { width: 180, height: 100 }
};
```

This is separate from the existing `DEFAULT_NODE_SIZE` (keyed by `Table['type']` — bridal/vip/regular — used only for first-time cascade placement, unchanged by this spec). Clicking a shape button calls `onUpdateLayout(table.id, { ...layout, shape, ...SHAPE_DEFAULT_SIZE[shape] })` — changing shape always resets to that shape's default size, consistent with "shape = starting point."

**Shape toggle UI:** grows from 2 buttons to a 2×2 icon grid in the same rounded pill container, using `Circle` (round), `Square` (square), and `RectangleHorizontal` (rectangle) from `lucide-react` as today, plus a small custom-styled span for "oval" (no dedicated ellipse icon exists in `lucide-react`; a `<span>` styled as a small ellipse — rounded, wider than tall, bordered in `currentColor` — matches the sizing/weight of the surrounding lucide icons closely enough to sit in the same row).

## 2. Resizing

**Library-first, matching the original floor-plan approach.** `@xyflow/react` ships resize primitives (`NodeResizer`, and the lower-level `NodeResizeControl` it's built from) purpose-built for exactly this — zoom/pan-aware, already integrated with the `useNodesState`/`onNodesChange` pipeline this canvas already wired up (the same fix that made node selection work). Hand-rolling this the way the rotate handle had to be hand-rolled (no library equivalent existed for arbitrary-angle rotation) would be reinventing a solved problem.

Per your choice of exactly 4 corner handles (no edge/single-axis handles): the all-in-one `NodeResizer` component renders both corner handles *and* invisible edge-drag lines by default with no prop to omit the edges, so the implementation uses four individual `NodeResizeControl` instances, one pinned to each corner (`top-left`/`top-right`/`bottom-left`/`bottom-right`), each dragging both width and height together. This is a documented pattern in React Flow's own examples for building a custom, corner-only resize handle set.

**Persistence:** matches the rotate handle's "commit once on release" pattern — a resize commits to `onUpdateLayout` (writing `x`, `y`, `width`, `height`) once when the drag ends, not on every pixel of movement. Live visual feedback during the drag comes from React Flow's own resize pipeline (the same store-backed mechanism that already drives live drag-to-reposition), so no separate hand-rolled "live size" state is needed the way rotation needed `liveRotation` — rotation had no library primitive to sit on top of; resizing does.

**Minimum size:** 60×60px, enforced via `NodeResizeControl`'s `minWidth`/`minHeight` so a table can never be shrunk into invisibility. No maximum.

**Only shows when selected**, alongside the existing rotate handle and shape toggle — all three controls share the same "selected node" gating already established.

## 3. Print Floor Plan

A new button lives **inside `TableFloorPlan.tsx`** (an overlay in the canvas's corner, styled like the existing outline-button treatment elsewhere on this page), not in `AdminTables.tsx`'s shared header where "Print Seating Chart" sits — it needs direct access to the canvas's `fitView`, and the two print actions already only apply to their own tab (List vs. Floor Plan), so keeping the trigger local to the component that owns the canvas avoids new cross-component plumbing.

**Behavior:** on click, get the `ReactFlowInstance` (captured via the `<ReactFlow onInit={...}>` callback, no `ReactFlowProvider` needed since the instance is obtained directly rather than via the `useReactFlow()` hook), call `instance.fitView({ duration: 0 })` to zoom/pan so every table is in frame, wait a frame (`requestAnimationFrame`) for that layout change to paint, then call `window.print()`.

**Print styling:** the on-screen `Controls` (zoom buttons) and `Background` (dot grid) get `print:hidden`, matching the `print:` utility convention already used throughout this page. The canvas container's fixed height/overflow constraints are left as-is for print — the fitted view is captured at its on-screen size and the browser's native print scaling handles fitting it to the page, the same fidelity level already accepted for the existing Seating List print (not a pixel-perfect, paginated export).

## Non-goals (explicitly out of scope this round)

- Aspect-ratio locking on any shape (explicitly decided against — all shapes resize freely).
- Any shape beyond round/oval/square/rectangle.
- Image/PDF export as a dependency (native browser print only, matching the existing print convention).
- A maximum size cap on resize.
- Pixel-perfect, paginated print output for large/spread-out layouts.
- Any change to the `Guest` schema or Firestore rules.

## Testing notes

- Manual verification in-browser (no automated test framework in this project, per established convention for this page):
  - Select a table, cycle through all 4 shape buttons — confirm each resets to its own preset size and the correct corner-rounding family (round/oval fully rounded, square/rectangle boxed).
  - Resize a table by dragging each of the 4 corner handles — confirm live visual feedback during the drag, exactly one persisted update on release, and that resizing past the minimum floor (60×60) is blocked.
  - Resize a round table non-uniformly and confirm it visually reads as oval (expected, not a bug) — reload and confirm the resized dimensions persisted.
  - Click "Print Floor Plan" with tables spread across a large area — confirm the view zooms/pans to fit everyone before the print dialog opens, and that Controls/Background don't appear in the print preview.
  - Confirm "Print Seating Chart" (List view) and "Print Floor Plan" (Floor Plan view) each only appear on their own tab, as today's "Print Seating Chart" already does.
