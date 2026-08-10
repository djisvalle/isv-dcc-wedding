import { useCallback, useRef, useState } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { RotateCw, Circle, Square, RectangleHorizontal } from 'lucide-react';
import type { Table } from './types';
import { getTableIcon, getTableTitle } from './tableDisplay';
import { SHAPE_DEFAULT_SIZE } from './floorPlanDefaults';

export type FloorPlanNodeData = {
  table: Table;
  occupants: number;
  capacity: number | undefined;
  onUpdateLayout: (tableId: string, layout: NonNullable<Table['layout']>) => void;
};

export type FloorPlanNode = Node<FloorPlanNodeData, 'tableNode'>;

export function FloorPlanTableNode({ data, selected }: NodeProps<FloorPlanNode>) {
  const { table, occupants, capacity, onUpdateLayout } = data;
  const layout = table.layout;
  const nodeRef = useRef<HTMLDivElement>(null);
  const [liveRotation, setLiveRotation] = useState<number | null>(null);

  const computeAngle = useCallback((clientX: number, clientY: number) => {
    const el = nodeRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
    // atan2 measures from the positive x-axis; add 90deg so the handle's
    // resting position (straight up) reads as 0deg, then normalize to
    // [0, 360).
    const deg = (angleRad * 180) / Math.PI + 90;
    return ((deg % 360) + 360) % 360;
  }, []);

  const handleRotateStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!layout) return;

    // Explicit pointer capture ensures pointerup/pointercancel are still
    // delivered to this element even if the cursor leaves the window
    // (mouse) or the OS takes over the gesture (touch scroll/pinch).
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture can fail (e.g. already released); the
      // pointercancel/pointerup listeners below still provide a safety net.
    }

    let settled = false;
    let lastAngle = computeAngle(e.clientX, e.clientY);

    const cleanup = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
    };

    const commit = (angle: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      setLiveRotation(null);
      onUpdateLayout(table.id, { ...layout, rotation: Math.round(angle) });
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      lastAngle = computeAngle(moveEvent.clientX, moveEvent.clientY);
      setLiveRotation(lastAngle);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      commit(computeAngle(upEvent.clientX, upEvent.clientY));
    };

    const onPointerCancel = () => {
      // No coordinates are reliable on cancel; commit the last known angle
      // so the drag always ends in a defined state instead of hanging open.
      commit(lastAngle);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
  }, [layout, computeAngle, onUpdateLayout, table.id]);

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
        {getTableIcon(table.type)}
        <div className="text-xs font-serif text-slate-900 text-center px-2 leading-tight">
          {getTableTitle(table.type, table.number)}
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {capacity !== undefined ? `${occupants}/${capacity}` : `${occupants} · Uncapped`}
        </div>
      </div>

      {selected && (
        <div
          className="nodrag absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-wedding-gold shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center"
          onPointerDown={handleRotateStart}
          title="Drag to rotate"
        >
          <RotateCw className="w-3 h-3 text-white" />
        </div>
      )}

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
    </div>
  );
}
