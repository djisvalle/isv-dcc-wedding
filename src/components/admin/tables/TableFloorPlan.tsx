import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ReactFlow, Background, Controls, useNodesState } from '@xyflow/react';
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
  onAssignDefaultLayouts: (entries: Array<{ tableId: string; layout: NonNullable<Table['layout']> }>) => void;
}

export function TableFloorPlan({ tables, guestsByTable, onUpdateLayout, onAssignDefaultLayouts }: TableFloorPlanProps) {
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
}
