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
