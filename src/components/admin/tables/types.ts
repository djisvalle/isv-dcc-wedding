import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';

export interface Table {
  id: string; // key: type-number
  type: 'bridal' | 'vip' | 'regular';
  number: string;
  capacity?: number; // undefined = uncapped
}

export const TABLE_TYPES = [
  { id: 'bridal', label: 'Bridal Table' },
  { id: 'vip', label: 'VIP Table' },
  { id: 'regular', label: 'Regular Table' }
] as const;

const TABLE_TYPE_ORDER = ['bridal', 'vip', 'regular'];

export function sortTables(tables: Table[]): Table[] {
  return [...tables].sort((a, b) => {
    const aOrder = TABLE_TYPE_ORDER.indexOf(a.type);
    const bOrder = TABLE_TYPE_ORDER.indexOf(b.type);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
  });
}

/** Dedupes by id (first occurrence wins) across any number of table lists, then sorts. */
export function mergeTables(...lists: Table[][]): Table[] {
  const byId: Record<string, Table> = {};
  for (const list of lists) {
    for (const t of list) {
      if (!byId[t.id]) byId[t.id] = t;
    }
  }
  return sortTables(Object.values(byId));
}

export const TABLE_LAYOUT_SETTING_ID = 'table_layout';

/**
 * Tables with guests seated are re-derivable from the guests themselves, but
 * an empty table (created ahead of assigning anyone) only exists in local
 * component state — so it silently disappeared on refresh. Persisting the
 * full active table list here means empty tables survive a reload.
 */
export async function persistTableLayout(tables: Table[]) {
  try {
    await setDoc(doc(db, 'settings', TABLE_LAYOUT_SETTING_ID), {
      key: TABLE_LAYOUT_SETTING_ID,
      value: JSON.stringify(tables.map(({ id, type, number, capacity }) => ({ id, type, number, capacity }))),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `settings/${TABLE_LAYOUT_SETTING_ID}`);
  }
}
