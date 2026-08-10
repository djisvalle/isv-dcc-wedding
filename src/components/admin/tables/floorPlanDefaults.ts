import type { Table } from './types';

const COLUMNS = 4;
const CELL_WIDTH = 220;
const CELL_HEIGHT = 180;
const MARGIN = 40;

const DEFAULT_NODE_SIZE: Record<Table['type'], { width: number; height: number; shape: 'round' | 'rectangle' }> = {
  bridal: { width: 160, height: 100, shape: 'round' },
  vip: { width: 140, height: 140, shape: 'round' },
  regular: { width: 160, height: 100, shape: 'rectangle' }
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
