import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Search, UserCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { SortableGuestItem } from './SortableGuestItem';
import { getEffectiveCapacity } from './capacity';
import type { Guest } from '@/features/guests/types';
import type { Table } from './types';

interface UnassignedContainerProps {
  guests: Guest[];
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  tableOccupants: Record<string, number>;
  hasFilter: boolean;
  isMobile?: boolean;
  selectedIds: string[];
  onToggleSelect: (guestId: string) => void;
  onClearSelection: () => void;
  onBulkAssign: (guestIds: string[], tableId: string) => void;
}

export const UnassignedContainer: React.FC<UnassignedContainerProps> = ({
  guests,
  onQuickMove,
  availableTables,
  tableOccupants,
  hasFilter,
  isMobile = false,
  selectedIds,
  onToggleSelect,
  onClearSelection,
  onBulkAssign
}) => {
  const { setNodeRef, isOver } = useSortable({
    id: 'unassigned-container',
    data: {
      isContainer: true,
      type: 'unassigned'
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-white lg:bg-slate-50/50 lg:rounded-3xl p-6 border transition-all flex flex-col
        ${isMobile ? 'h-full border-none' : 'h-[calc(100vh-200px)] border-slate-100 rounded-3xl'}
        ${!isMobile && isOver ? 'border-wedding-gold bg-wedding-gold/5 ring-1 ring-wedding-gold shadow-lg scale-[1.02]' : ''}
      `}
    >
      {selectedIds.length > 0 ? (
        <div className="flex items-center justify-between mb-4 gap-2">
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{selectedIds.length} selected</span>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" className="h-8 rounded-lg bg-wedding-gold hover:bg-wedding-gold/80 text-xs">
                    Assign to table
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-bold">
                  Assign {selectedIds.length} guest{selectedIds.length === 1 ? '' : 's'} to...
                </DropdownMenuLabel>
                {availableTables.map(table => {
                  const capacity = getEffectiveCapacity(table);
                  const occupants = tableOccupants[table.id] ?? 0;
                  const label = table.type === 'bridal' ? 'Bridal Table' : table.type === 'vip' ? `VIP ${table.number}` : `Regular ${table.number}`;
                  const occupancyLabel = capacity !== undefined ? `${occupants}/${capacity}` : `${occupants}`;
                  return (
                    <DropdownMenuItem
                      key={table.id}
                      className="flex justify-between items-center text-xs"
                      onClick={() => onBulkAssign(selectedIds, table.id)}
                    >
                      <span>{label}</span>
                      <span className="text-slate-400">{occupancyLabel}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={onClearSelection}>
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-slate-800">Unassigned</h3>
          <span className="text-[10px] px-2 py-1 bg-white text-slate-400 rounded-full border border-slate-100 font-bold">
            {guests.length}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
        <SortableContext items={guests.map(g => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {guests.map((guest) => (
              <SortableGuestItem
                key={guest.id}
                guest={guest}
                onQuickMove={onQuickMove}
                availableTables={availableTables}
                selectable
                selected={selectedIds.includes(guest.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
            {guests.length === 0 && (
              <div className="text-center py-12 text-slate-300">
                {hasFilter ? (
                  <>
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-10" />
                    <p className="text-xs uppercase tracking-widest font-bold">No matches</p>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-10" />
                    <p className="text-xs uppercase tracking-widest font-bold">Done!</p>
                  </>
                )}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
