# Floor Plan: Snap to Grid + Alignment Guides + Size Matching

## Context

The floor-plan canvas (`TableFloorPlan.tsx` + `FloorPlanTableNode.tsx`, built on `@xyflow/react`) currently supports free drag-to-reposition and free corner-handle resize, with no assistance for lining tables up with each other or with a grid. This spec adds Canva/Photoshop-style placement assistance: snap-to-grid, live alignment guides while dragging, and size-matching while resizing.

## Goals

1. An optional grid snap (position + size) toggle.
2. Live alignment guide lines while dragging a table, snapping to another table's edges/center.
3. Size-matching while resizing, snapping to another table's width/height.

## 1. Grid snap

`@xyflow/react`'s `<ReactFlow>` has native `snapToGrid`/`snapGrid` props — confirmed directly against the installed `12.11.2` source (`@xyflow/system`'s `getPointerPosition` snaps the raw pointer position to the grid before either drag or resize math runs), so enabling these two props covers **both** position-while-dragging and size-while-resizing with zero custom snapping code. `snapGrid={[24, 24]}` matches the canvas `Background`'s existing dot spacing (`gap={24}`), so what's visible is what things snap to.

A toggle button next to "Print Floor Plan" flips a `gridSnapEnabled` boolean into these two props. Off by default.

## 2. Alignment guides (drag)

While dragging a table, its position is compared against every other table's bounding box on each axis independently (x separate from y):
- **Edges:** left-to-left, left-to-right, right-to-left, right-to-right (and the vertical equivalents: top/bottom).
- **Centers:** horizontal center-to-center, vertical center-to-center.

When the dragged table's position on an axis comes within a small threshold (6px, in screen space — converted to flow-space via the current zoom) of any of these, that axis snaps to the exact matching value and a thin guide line renders at that coordinate, in a **new accent color** (a soft blue, distinct from the app's gold theme already used for selection/handles, and distinct from the rose used elsewhere for capacity warnings) so it reads unambiguously as a placement-assist signal rather than app chrome.

**Interaction with grid snap:** object-to-object alignment takes priority over the grid when both are active and both are within threshold on the same axis — a nearby table is a more useful anchor than a generic grid line. Grid snap only applies when enabled and no object alignment is closer on that axis.

**Where this lives:** `TableFloorPlan.tsx` already owns the `onNodesChange` handler from `useNodesState` — every drag position update already flows through it (this is the same mechanism the earlier floor-plan work verified makes live drag feedback possible at all). Alignment-guide computation and snapping is implemented by intercepting that handler: for any `'position'` change still mid-drag (`dragging: true`), compute guides against all other tables' current bounds, adjust the reported position if within threshold, and update the on-screen guide-line state before passing the change through. This reuses an already-verified-working interception point rather than adding a new one.

## 3. Size matching (resize)

While resizing, the new width and height are each independently compared against every other table's width/height (any shape, per the earlier decision — a round table can match a rectangle's width). When a dimension comes within threshold of another table's matching dimension, it snaps to that exact value, and the matched table gets a thin blue ring (the same accent color as the guide lines) for the duration of the resize, so it's clear *which* table was matched.

This uses the same `onNodesChange` interception point as drag guides — resize changes (`'dimensions'` type, `resizing: true`) already flow through the identical handler (verified during the original resize implementation: `NodeResizeControl` → `triggerNodeChanges` → the app's `onNodesChange`, the same pathway drag position changes use). No separate data-plumbing into `FloorPlanTableNode` is needed for the matching logic itself; only the transient "which table is the match target" flag needs to reach the matched node, done via a lightweight per-render `data` overlay (not the more expensive node-list rebuild), so it doesn't add cost to the common case where nothing is being resized.

## Non-goals (explicitly out of scope this round)

- Snapping/guides for rotation (only position and size are covered).
- A configurable grid size or snap threshold (fixed at 24px grid / 6px threshold this round).
- Persisting the grid-snap toggle's on/off state across sessions (resets to off on reload, consistent with other view-only UI state on this page).
- Multi-table alignment (aligning several selected tables as a group) — single-table drag/resize only, consistent with the rest of the floor-plan canvas today.
- Any change to the `Guest` schema, `Table.layout` shape, or Firestore rules — this is purely an interaction-layer feature on top of the existing `x`/`y`/`width`/`height` fields.

## Testing notes

- Manual verification in-browser (no automated test framework in this project, per established convention for this page):
  - Toggle grid snap on, drag a table — confirm it jumps in 24px increments matching the visible background dots; toggle off — confirm free positioning returns.
  - Toggle grid snap on, resize a table — confirm width/height also land on 24px increments.
  - Drag one table near another — confirm a blue guide line appears when edges or centers align, and the table snaps to that alignment; confirm the line disappears when the drag ends.
  - Resize a table until its width or height approaches another table's — confirm it snaps to match exactly and the matched table shows a blue ring during the resize, which disappears once the resize ends.
  - With grid snap on, drag a table near another table where both a grid line and an object edge are close — confirm the object edge wins.
  - Confirm none of this affects rotation, shape-toggle, or the existing print output (guide lines/rings should not appear in print, matching the existing pattern for other selection chrome).
