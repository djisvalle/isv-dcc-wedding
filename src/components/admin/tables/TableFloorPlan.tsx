import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, useNodesState } from '@xyflow/react';
import type { Node, NodeChange, NodeTypes, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Printer, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Guest } from '@/features/guests/types';
import type { Table } from './types';
import { getEffectiveCapacity } from './capacity';
import { getDefaultLayout } from './floorPlanDefaults';
import { FloorPlanTableNode, type FloorPlanNode } from './FloorPlanTableNode';
import { computeAlignmentSnap, type Bounds } from './snapGuides';
import { GuideLinesOverlay } from './GuideLinesOverlay';

const nodeTypes: NodeTypes = { tableNode: FloorPlanTableNode };
const EMPTY_GUESTS: Guest[] = [];

interface TableFloorPlanProps {
  tables: Table[];
  guestsByTable: Record<string, Guest[]>;
  onUpdateLayout: (tableId: string, layout: NonNullable<Table['layout']>) => void;
  onAssignDefaultLayouts: (entries: Array<{ tableId: string; layout: NonNullable<Table['layout']> }>) => void;
}

export function TableFloorPlan({ tables, guestsByTable, onUpdateLayout, onAssignDefaultLayouts }: TableFloorPlanProps) {
  const [gridSnapEnabled, setGridSnapEnabled] = useState(false);

  // First-time placement: any tables with no saved layout get a cascading
  // default position assigned in a single batched call, so a first-ever
  // open doesn't fire one Firestore write per table.
  useEffect(() => {
    const missing = tables.filter(table => !table.layout);
    if (missing.length === 0) return;
    onAssignDefaultLayouts(
      missing.map(table => ({
        tableId: table.id,
        layout: getDefaultLayout(tables.indexOf(table), table.type)
      }))
    );
  }, [tables, onAssignDefaultLayouts]);

  const derivedNodes: FloorPlanNode[] = useMemo(() =>
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

  // Nodes are held locally so React Flow's own onNodesChange pipeline can
  // apply live drag/selection changes (position updates every pointermove,
  // `selected` flips on click). Without this, ReactFlow is fully controlled
  // with nowhere for those changes to land, so dragging never visually
  // tracks the cursor and nodes can never become selected.
  const [nodes, setNodes, onNodesChange] = useNodesState<FloorPlanNode>(derivedNodes);

  const [guideState, setGuideState] = useState<{ verticalGuideX?: number; horizontalGuideY?: number; matchedTableId?: string } | null>(null);

  // Track which node ids are mid-drag so the reconciliation effect below
  // doesn't stomp on an in-flight drag position with a stale derived one.
  const draggingNodeIds = useRef<Set<string>>(new Set());

  // Reconcile local node state whenever the derived (tables/guestsByTable)
  // list changes, e.g. after persistTableLayout round-trips through
  // Firestore elsewhere. Preserve live selection always, and preserve the
  // live position for any node currently being dragged so it doesn't jump.
  useEffect(() => {
    setNodes(current => {
      const currentById = new Map(current.map(n => [n.id, n]));
      return derivedNodes.map(dn => {
        const existing = currentById.get(dn.id);
        if (!existing) return dn;
        return {
          ...dn,
          position: draggingNodeIds.current.has(dn.id) ? existing.position : dn.position,
          selected: existing.selected
        };
      });
    });
  }, [derivedNodes, setNodes]);

  const handleNodeDragStart = useCallback((_event: unknown, node: Node) => {
    draggingNodeIds.current.add(node.id);
  }, []);

  // Populated via <ReactFlow>'s onInit below. A plain ref (not a hook) so it
  // can be read imperatively from callbacks defined here in the parent
  // component that renders <ReactFlow> — that parent scope sits outside the
  // ReactFlowProvider context <ReactFlow> creates for its own children, so
  // hooks like useStoreApi()/useReactFlow() aren't callable here (confirmed
  // via @xyflow/react's source and a runtime "no ReactFlowProvider ancestor"
  // error when tried). The instance object itself has no such restriction:
  // its methods (e.g. getViewport(), fitView() used below in handlePrint)
  // are plain closures already bound to the store at creation time.
  const reactFlowInstanceRef = useRef<ReactFlowInstance<FloorPlanNode> | null>(null);

  // Tracks the last position handleNodesChange computed for each in-progress
  // drag (post-snap, when a snap applied) so handleNodeDragStop can persist
  // that instead of the drag-stop event's own `node.position`. This is
  // necessary, not cosmetic: confirmed empirically (by logging both values
  // side by side) that React Flow's onNodeDragStop reports its own
  // internally-tracked raw pointer position, computed independently of
  // whatever position onNodesChange returns — so without this ref, a
  // mid-drag snap is visible while dragging but silently reverts to the
  // raw, unaligned position the instant the table is dropped, defeating the
  // point of snapping. Cleared once read so a future unrelated drag can't
  // accidentally reuse a stale entry.
  const lastComputedPositionRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const handleNodeDragStop = useCallback((_event: unknown, node: Node) => {
    draggingNodeIds.current.delete(node.id);
    setGuideState(null);
    const table = tables.find(t => t.id === node.id);
    if (!table?.layout) return;
    const snapped = lastComputedPositionRef.current.get(node.id);
    lastComputedPositionRef.current.delete(node.id);
    const { x, y } = snapped ?? node.position;
    onUpdateLayout(node.id, { ...table.layout, x, y });
  }, [tables, onUpdateLayout]);

  const SNAP_THRESHOLD_SCREEN_PX = 6;

  // Intercepts the same onNodesChange pipeline that already makes live
  // drag/resize feedback possible (see the useNodesState comment above) to
  // add Canva/Figma-style alignment: for every drag-originated position
  // change (dragging true *or* false — see note below), compare the dragged
  // table's edges/center against every other table's on each axis
  // independently, snap to the closest match within threshold, record the
  // matched coordinate so GuideLinesOverlay can draw it, and stash the
  // resulting (possibly snapped) position in lastComputedPositionRef so
  // handleNodeDragStop can persist it on release (see that ref's comment).
  //
  // `change.dragging` is checked with `!== undefined` rather than a truthy
  // check so the snap also applies to the final `dragging: false` change
  // XYDrag emits on pointer-up (as well as `dragging: true` in-progress
  // frames) — otherwise that last change would fall through unmodified.
  const handleNodesChange = useCallback((changes: NodeChange<FloorPlanNode>[]) => {
    const zoom = reactFlowInstanceRef.current?.getViewport().zoom ?? 1;
    const threshold = SNAP_THRESHOLD_SCREEN_PX / zoom;

    const adjusted = changes.map(change => {
      if (change.type === 'position' && change.dragging !== undefined && change.position) {
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
        // Only paint guides for genuine in-progress drag frames (dragging:
        // true). `dragging: false` covers two cases that must NOT paint a
        // guide: the final mouse-release frame (handleNodeDragStop is about
        // to clear guideState anyway) and keyboard arrow-key nudges
        // (useMoveSelectedNodes emits `dragging: false` with no
        // onNodeDragStop to follow, so a guide painted there would never
        // clear).
        if (change.dragging === true) {
          setGuideState({ verticalGuideX: snap.verticalGuideX, horizontalGuideY: snap.horizontalGuideY });
        }

        const resolved = {
          x: snap.x ?? change.position.x,
          y: snap.y ?? change.position.y
        };
        lastComputedPositionRef.current.set(change.id, resolved);

        if (snap.x === undefined && snap.y === undefined) return change;
        return { ...change, position: resolved };
      }

      return change;
    });

    onNodesChange(adjusted);
  }, [tables, onNodesChange]);

  const handlePrint = useCallback(() => {
    // Clear any active selection first so the gold selection ring/border
    // (and the per-node editing chrome it gates, see FloorPlanTableNode's
    // print:hidden handles) doesn't appear in the printed output.
    setNodes(ns => ns.map(n => (n.selected ? { ...n, selected: false } : n)));
    // Intentionally not awaited: with zero tables on the canvas this promise
    // never resolves (fitView's resolution requires nodesInitialized, which
    // requires at least one node), so awaiting it would hang printing
    // forever in that state. The double-rAF below is the actual paint gate.
    void reactFlowInstanceRef.current?.fitView({ duration: 0 });
    // Two animation frames give the fit-view's layout change time to paint
    // before the print dialog captures the DOM — a single frame is
    // sometimes too early in some browsers.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }, [setNodes]);

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
        {/*
          @xyflow/react's own stylesheet sets `.react-flow__controls { display: flex }`
          unconditionally (no media query) with the same specificity as Tailwind's
          `print:hidden`. Since that library stylesheet loads after Tailwind's in this
          app's bundle, it wins the cascade tie even under print media, so a plain
          `print:hidden` here silently fails to hide the zoom controls when printing.
          The trailing `!` (Tailwind v4's important-modifier syntax, already used
          elsewhere in this codebase, e.g. src/components/ui/command.tsx) forces
          `display: none !important` so it wins regardless of source order.
        */}
        <Controls showInteractive={false} className="print:hidden!" />
      </ReactFlow>
    </div>
  );
}
