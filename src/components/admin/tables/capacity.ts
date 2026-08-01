import type { Table } from './types';

export type CapacityStatus = 'none' | 'room' | 'full' | 'over';

export const DEFAULT_CAPACITY: Record<Table['type'], number | undefined> = {
  bridal: undefined,
  vip: 6,
  regular: 10,
};

/** Falls back to the type's default when the table has no explicit capacity set. */
export function getEffectiveCapacity(table: Pick<Table, 'type' | 'capacity'>): number | undefined {
  return table.capacity ?? DEFAULT_CAPACITY[table.type];
}

export function getCapacityStatus(occupants: number, capacity: number | undefined): CapacityStatus {
  if (capacity === undefined) return 'none';
  if (occupants > capacity) return 'over';
  if (occupants === capacity) return 'full';
  return 'room';
}
