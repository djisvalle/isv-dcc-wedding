import React, { useState } from 'react';
import {
  GripVertical,
  Plus,
  UserCheck,
  UserX
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import type { Guest } from '@/features/guests/types';
import type { Table } from './types';

interface SortableGuestItemProps {
  guest: Guest;
  isOverlay?: boolean;
  onQuickMove?: (guestId: string, tableId: string | null) => void;
  availableTables?: Table[];
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (guestId: string) => void;
}

export const SortableGuestItem = React.memo<SortableGuestItemProps>(({
  guest,
  isOverlay = false,
  onQuickMove,
  availableTables = [],
  selectable = false,
  selected = false,
  onToggleSelect
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: guest.id,
    data: {
      type: 'guest',
      guest
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? 0.98 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : 1,
  };

  const currentTableId = guest.table_type ? `${guest.table_type}-${guest.table_number || ''}` : null;

  // The dropdown's content (a DropdownMenuItem per table) is only ever
  // visible for whichever single row is currently open, but constructing
  // it is not free — with dozens of tables and (especially) dozens of
  // guests in the Unassigned list, building it unconditionally on every
  // render adds up fast during a drag, when dnd-kit re-renders many
  // sibling rows per frame to animate the "make room" reflow. Gating it
  // behind real open state means closed rows (the overwhelming majority
  // at any moment) skip that work entirely.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex flex-col p-3 bg-white border border-slate-100 rounded-xl shadow-sm mb-2 group/guest
        ${isOverlay ? 'shadow-lg border-wedding-gold border-2 scale-105 z-50' : ''}
        ${!isOverlay ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        {selectable && !isOverlay && onToggleSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(guest.id)}
            className="flex-shrink-0"
          />
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0" {...attributes} {...listeners}>
          <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
          <div className="truncate">
            <span className="text-sm text-slate-700 font-medium group-hover/guest:text-wedding-gold transition-colors truncate block">
              {guest.name} {guest.is_baby_or_child && <span className="text-[10px] text-slate-400 font-normal">(Baby/Child)</span>}
            </span>
          </div>
        </div>

        {!isOverlay && onQuickMove && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {guest.role && (
              <span className="text-[8px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded uppercase font-bold whitespace-nowrap">
                {guest.role}
              </span>
            )}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/guest:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3" />
                </Button>
              }
            />
              {isMenuOpen && (
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-bold">Move Guest To...</DropdownMenuLabel>
                    {currentTableId !== null && (
                       <DropdownMenuItem
                        className="flex items-center gap-2 text-red-500 text-xs font-medium"
                        onClick={() => onQuickMove(guest.id, null)}
                      >
                        <UserX className="w-3 h-3" />
                        Unassign Guest
                      </DropdownMenuItem>
                    )}
                    {availableTables.map(table => (
                      <DropdownMenuItem
                        key={table.id}
                        disabled={table.id === currentTableId}
                        className="flex justify-between items-center text-xs"
                        onClick={() => onQuickMove(guest.id, table.id)}
                      >
                        <span>
                          {table.type === 'bridal' ? 'Bridal Table' :
                           table.type === 'vip' ? `VIP ${table.number}` : `Regular ${table.number}`}
                        </span>
                        {table.id === currentTableId && <UserCheck className="w-3 h-3 text-wedding-gold" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          </div>
        )}
      </div>
      {guest.nickname && (
        <span className="text-[10px] text-slate-400 italic mt-0.5 ml-5 truncate">"{guest.nickname}"</span>
      )}
    </div>
  );
});

SortableGuestItem.displayName = 'SortableGuestItem';
