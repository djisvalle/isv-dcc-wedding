import type { Table, TableShape } from './types';

const COLUMNS = 4;
const CELL_WIDTH = 220;
const CELL_HEIGHT = 180;
const MARGIN = 40;

const DEFAULT_NODE_SIZE: Record<Table['type'], { width: number; height: number; shape: TableShape }> = {
  bridal: { width: 160, height: 100, shape: 'round' },
  vip: { width: 140, height: 140, shape: 'round' },
  regular: { width: 160, height: 100, shape: 'rectangle' }
};

/**
 * Default dimensions a table resets to when the shape toggle picks a new
 * shape — separate from `DEFAULT_NODE_SIZE` above, which only governs
 * first-time cascade placement by table *type* (bridal/vip/regular), not by
 * shape. Since resizing is free in both dimensions with no aspect lock, a
 * shape's rendering family (elliptical vs. boxed corners) is permanent but
 * its proportions aren't — this map is only a starting point.
 */
export const SHAPE_DEFAULT_SIZE: Record<TableShape, { width: number; height: number }> = {
  round: { width: 140, height: 140 },
  oval: { width: 200, height: 110 },
  square: { width: 140, height: 140 },
  rectangle: { width: 180, height: 100 }
};

/**
 * Cascading-grid default position for a table that has never been placed on
 * the floor-plan canvas, so it's never invisible on first render. `index` is
 * the table's position within the full active-tables list — stable enough
 * for a first-time default; collisions with manually-placed tables are not
 * avoided (explicitly out of scope, see the design spec's non-goals).
 */
export function getDefaultLayout(index: number, type: Table['type']): NonNullable<Table['layout']> {
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const { width, height, shape } = DEFAULT_NODE_SIZE[type];
  return {
    x: MARGIN + col * CELL_WIDTH,
    y: MARGIN + row * CELL_HEIGHT,
    rotation: 0,
    shape,
    width,
    height
  };
}
