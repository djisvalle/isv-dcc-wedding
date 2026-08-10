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
