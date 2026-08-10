import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, useNodesState } from '@xyflow/react';
import type { Node, NodeTypes, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Printer, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const handleNodeDragStop = useCallback((_event: unknown, node: Node) => {
    draggingNodeIds.current.delete(node.id);
    const table = tables.find(t => t.id === node.id);
    if (!table?.layout) return;
    onUpdateLayout(node.id, { ...table.layout, x: node.position.x, y: node.position.y });
  }, [tables, onUpdateLayout]);

  const reactFlowInstanceRef = useRef<ReactFlowInstance<FloorPlanNode> | null>(null);

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
