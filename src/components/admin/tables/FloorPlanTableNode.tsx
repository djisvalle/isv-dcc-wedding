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
