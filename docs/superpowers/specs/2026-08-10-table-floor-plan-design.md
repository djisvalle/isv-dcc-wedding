# Table Arrangement: Visual Floor-Plan Canvas

## Context

`src/pages/admin/AdminTables.tsx` currently shows tables as a CSS grid of cards, sorted by type/number — there is no spatial concept of the venue at all. This spec adds a second view to that same page: a free-form drag-and-drop canvas where tables can be positioned, shaped, and rotated to roughly simulate the real room layout. This is purely a *visual arrangement* tool — it does not touch guest-to-table assignment, which stays in the existing List view (covered by `2026-08-09-table-arrangement-fixes-design.md`).

## Goals

1. A toggle between the existing seating list and a new floor-plan canvas, on the same page, sharing the same table/guest data.
2. Free-form positioning of tables (drag anywhere), not constrained to a grid.
3. Round or rectangular table shapes, with rotation.
4. Zoom and pan for venues with many tables.
5. Live occupancy shown per table on the canvas, without allowing guest drag-and-drop there.

## Discussion: implementation approaches

The page has no canvas/graphics dependency today — `@dnd-kit` (used for the seating list) handles list-reordering drag-and-drop but has no zoom, pan, or rotation primitives, and free-form 2D positioning isn't its intended use case. Three approaches were considered:

| Approach | Pros | Cons |
|---|---|---|
| **`@xyflow/react` (React Flow)** — *chosen* | Nodes are plain React components, so table cards reuse existing Tailwind/Card styling; pan/zoom/drag-to-move are built in; well-maintained, widely used, DOM-based (keeps accessibility/styling consistent with the rest of the app) | It's a node-graph library at heart (nodes + edges); this feature only uses the canvas/node half and ignores edges — a small conceptual mismatch, though harmless in practice. Rotation isn't built in and needs a small custom handle. |
| **`react-konva`** | `Transformer` component gives rotate + resize handles for free — the most native fit for "rotatable shapes" | Renders to `<canvas>`, not DOM — table labels/icons become canvas-drawn shapes/text instead of HTML, so none of the existing Tailwind card styling carries over; heavier dependency for a single feature; harder to keep visually consistent with the rest of the admin UI |
| **Hand-rolled** (custom transform math on top of `framer-motion`, already installed) | Zero new dependencies | Zoom, pan, rotation, and hit-testing all become custom geometry code — a meaningful amount of fiddly, bug-prone work for something existing libraries already solve well |

**Chosen: React Flow.** It keeps the floor plan visually consistent with the rest of the admin UI (real components, not canvas-drawn shapes) and provides pan/zoom for free, leaving rotation as the only meaningfully custom piece.

## 1. Placement: new view within `AdminTables`, not a separate page

A view toggle (`Seating List | Floor Plan`) near the existing page header switches between the current grid (unchanged) and the new canvas. Both views read from the same `activeTables` and `guests` state already owned by `AdminTables` — no duplicate Firestore reads. Table creation/deletion and capacity editing remain List-view-only responsibilities; Floor Plan only arranges the position/shape/rotation of tables that already exist.

## 2. Data model

`Table` ([types.ts](../../../src/components/admin/tables/types.ts)) gains an optional `layout` field:

```ts
interface Table {
  id: string;
  type: 'bridal' | 'vip' | 'regular';
  number: string;
  capacity?: number;
  layout?: {
    x: number;
    y: number;
    rotation: number;       // degrees, 0-359
    shape: 'round' | 'rectangle';
    width: number;
    height: number;
  };
}
```

`layout` is `undefined` for any table that has never been placed on the canvas. `persistTableLayout` (already the single source of truth for capacity and for empty tables surviving a refresh) is extended to also serialize `layout` — no new Firestore document, no schema change to `Guest`.

**First-time placement:** a table with no `layout` (newly added, or pre-existing from before this feature shipped) is auto-placed by a simple cascading-grid default the first time Floor Plan view renders it (wrap every N tables per row, offset each row), so no table is ever invisible on the canvas. That default position is written back via `persistTableLayout` as soon as it's assigned, exactly as if the user had dragged it there.

**Shape/size defaults:** new placements default to `round` for `bridal`/`vip` tables and `rectangle` for `regular` tables (matching common real-world seating conventions), with type-based default width/height. No manual resize handles in v1 (YAGNI — only shape and rotation are explicitly requested).

## 3. New component: `TableFloorPlan`

`src/components/admin/tables/TableFloorPlan.tsx`, wrapping `@xyflow/react`'s `<ReactFlow>`:

- A custom `TableNode` component renders each table as a round or rectangular card, reusing the existing icon/title logic (`getTableIcon`/`getTableTitle` from `DroppableTable`) and showing a live `"{occupants}/{capacity}"` (or `"{occupants} · Uncapped"`) readout, computed from the same `guestsByTable`/`countOccupants` logic already used in List view — no new derivation, just passed down as props.
- `Controls` (zoom in/out, fit-to-view) and a dotted `Background` come directly from React Flow.
- Selecting a node reveals: a rotate handle (custom overlay — drag in an arc around the node's center to set `rotation`) and a small round/rectangle shape toggle.
- Dragging a node updates `x`/`y` via React Flow's built-in node-dragging; on drag end (and on rotate/shape-toggle release), the new `layout` is written back through `persistTableLayout`, mirroring how capacity edits already commit on blur/change.

## 4. Interaction scope (explicitly guest-free)

The canvas only arranges table *positions, shapes, and rotation* — it does not support dragging guests. Each `TableNode` is read-only with respect to guest membership; it only displays the live occupancy count. All guest assignment (drag, search, quick-assign, bulk-assign, unassign-all from `2026-08-09-table-arrangement-fixes-design.md`) stays exclusively in List view. This keeps the canvas's responsibility narrow and avoids duplicating the drag-and-drop guest logic across two views.

## 5. Mobile

Floor Plan is desktop-first, consistent with the drag-and-drop-heavy nature of the rest of this page. On small screens, the view toggle still exists, but selecting Floor Plan shows a brief "best viewed on a larger screen" notice in place of the canvas rather than attempting cramped touch drag/rotate/zoom. List view remains fully functional on mobile, unchanged.

## 6. Error handling

Position/rotation/shape writes follow the same pattern as every other write on this page: `persistTableLayout` already funnels failures through `handleFirestoreError`. A failed write surfaces a toast but does not roll back the local optimistic state, matching existing behavior (e.g. capacity edits).

## Non-goals (explicitly out of scope this round)

- Guest-to-table assignment on the canvas (stays in List view).
- Manual resizing of table nodes (shape and rotation only; width/height are type-based defaults).
- Venue background image upload/backdrop.
- Any change to the `Guest` schema or Firestore rules.
- Multi-select / bulk move of tables on the canvas.
- Snapping/alignment guides, collision detection between tables.

## Testing notes

- Manual verification in-browser (no existing automated test coverage for this page, consistent with the rest of `AdminTables.tsx`):
  - Switch between List and Floor Plan views — confirm table/guest data stays in sync (e.g. a capacity edit in List view is reflected in the Floor Plan occupancy readout without a reload).
  - Drag a table to a new position, reload the page — confirm the position persists via `settings/table_layout`.
  - Rotate a table and toggle its shape — confirm both persist across reload and render correctly for both `round` and `rectangle`.
  - Add a new table in List view, switch to Floor Plan — confirm it appears via the cascade default rather than being invisible or overlapping an existing table.
  - Zoom/pan with several tables placed — confirm `Controls` and scroll/drag work as expected.
  - View on a small viewport — confirm the "best viewed on a larger screen" notice appears instead of a broken/cramped canvas.
