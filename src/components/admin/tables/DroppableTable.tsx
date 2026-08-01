import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users,
  User,
  Crown,
  Star,
  GlassWater,
  Plus,
  Trash2,
  Search,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableGuestItem } from './SortableGuestItem';
import { getEffectiveCapacity, getCapacityStatus } from './capacity';
import type { Guest } from '@/features/guests/types';
import type { Table } from './types';

interface DroppableTableProps {
  table: Table;
  allTableGuests: Guest[];
  visibleGuests: Guest[];
  hasGuestFilter: boolean;
  onRemoveTable: (id: string) => void;
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  unassignedGuests: Guest[];
  onUpdateCapacity: (tableId: string, capacity: number | undefined) => void;
}

export const DroppableTable = React.memo<DroppableTableProps>(({ table, allTableGuests, visibleGuests, hasGuestFilter, onRemoveTable, onQuickMove, availableTables, unassignedGuests, onUpdateCapacity }) => {
  const { setNodeRef, isOver } = useSortable({
    id: table.id,
    data: {
      type: 'table',
      table,
      isContainer: true
    }
  });

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [capacityDraft, setCapacityDraft] = useState('');

  const countOccupants = allTableGuests.filter(g => !g.is_baby_or_child).length;
  const capacity = getEffectiveCapacity(table);
  const status = getCapacityStatus(countOccupants, capacity);

  const startEditCapacity = () => {
    setCapacityDraft(capacity !== undefined ? String(capacity) : '');
    setIsEditingCapacity(true);
  };

  const commitCapacity = () => {
    setIsEditingCapacity(false);
    const trimmed = capacityDraft.trim();
    if (trimmed === '') {
      onUpdateCapacity(table.id, undefined);
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error('Capacity must be a positive number');
      return;
    }
    onUpdateCapacity(table.id, parsed);
  };

  const filteredUnassigned = unassignedGuests.filter(g =>
    g.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
    (g.nickname && g.nickname.toLowerCase().includes(assignSearch.toLowerCase()))
  );

  const getTableIcon = (type: string) => {
    switch (type) {
      case 'bridal': return <Crown className="w-5 h-5 text-wedding-gold" />;
      case 'vip': return <Star className="w-5 h-5 text-amber-400" />;
      case 'regular': return <GlassWater className="w-5 h-5 text-wedding-gold/60" />;
      default: return <User className="w-5 h-5 text-slate-300" />;
    }
  };

  const getTableTitle = (type: string, number: string) => {
    switch (type) {
      case 'bridal': return 'Bridal Table';
      case 'vip': return `VIP Table ${number}`;
      case 'regular': return `Regular Table ${number}`;
      default: return 'No Table Assigned';
    }
  };

  return (
    <div ref={setNodeRef} className="h-full">
      <Card className={`
        h-full border-slate-200/60 shadow-sm transition-all rounded-3xl overflow-hidden group
        ${isOver ? 'ring-2 ring-wedding-gold scale-[1.02] bg-wedding-gold/5' : status === 'over' ? 'ring-2 ring-rose-300' : ''}
      `}>
        <CardHeader className={`
          pb-4 border-b border-slate-50
          ${table.type === 'bridal' ? 'bg-wedding-gold/5' : table.type === 'vip' ? 'bg-amber-50/30' : 'bg-transparent'}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                {getTableIcon(table.type)}
              </div>
              <div>
                <CardTitle className="text-lg font-serif text-slate-900">
                  {getTableTitle(table.type, table.number)}
                </CardTitle>
                {hasGuestFilter && countOccupants > 0 && (
                  <p className="text-[9px] text-wedding-gold/80 font-bold uppercase tracking-widest">
                    {visibleGuests.filter(g => !g.is_baby_or_child).length} of {countOccupants} shown
                  </p>
                )}
                <div className="mt-0.5 print:hidden">
                  {isEditingCapacity ? (
                    <Input
                      autoFocus
                      type="number"
                      min={1}
                      value={capacityDraft}
                      onChange={e => setCapacityDraft(e.target.value)}
                      onFocus={e => e.target.select()}
                      onBlur={commitCapacity}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commitCapacity(); }
                        if (e.key === 'Escape') { e.preventDefault(); setIsEditingCapacity(false); }
                      }}
                      placeholder="Uncapped"
                      className="h-6 w-24 px-2 text-xs"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={startEditCapacity}
                      title="Click to edit capacity"
                      className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-wedding-gold transition-colors inline-flex items-center gap-1"
                    >
                      {capacity !== undefined
                        ? `${countOccupants} / ${capacity} Guest${capacity === 1 ? '' : 's'}`
                        : `${countOccupants} Guest${countOccupants === 1 ? '' : 's'} · Uncapped`}
                      {status === 'over' && (
                        <span title={`${countOccupants - (capacity ?? 0)} over capacity`}>
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                        </span>
                      )}
                    </button>
                  )}
                  {capacity !== undefined && (
                    <div className="mt-1 h-1 w-24 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === 'over' ? 'bg-rose-500' : status === 'full' ? 'bg-amber-400' : 'bg-wedding-gold'
                        }`}
                        style={{ width: `${Math.min((countOccupants / capacity) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <p className="hidden print:block text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  {capacity !== undefined ? `${countOccupants} / ${capacity} Guests` : `${countOccupants} Guests`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 print:hidden">
              <Dialog open={isAssignOpen} onOpenChange={(open) => {
                setIsAssignOpen(open);
                if (!open) setAssignSearch('');
              }}>
                <DialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5 transition-all"
                      title="Quick Assign Guest"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-sm rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-serif">Add Guest to {getTableTitle(table.type, table.number)}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search unassigned guests..."
                        className="pl-9 h-11 bg-slate-50 border-none rounded-xl"
                        value={assignSearch}
                        onChange={e => setAssignSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-1">
                      {filteredUnassigned.length > 0 ? (
                        filteredUnassigned.map(g => (
                          <button
                            key={g.id}
                            onClick={() => {
                              onQuickMove(g.id, table.id);
                              setIsAssignOpen(false);
                            }}
                            className="w-full text-left p-3 rounded-xl hover:bg-wedding-gold/5 transition-colors group flex items-center justify-between"
                          >
                            <div>
                              <div className="text-sm font-medium text-slate-700">{g.name}</div>
                              {g.nickname && <div className="text-[10px] text-slate-400 italic">"{g.nickname}"</div>}
                            </div>
                            <UserCheck className="w-4 h-4 text-wedding-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-8 text-slate-300 text-xs uppercase tracking-widest font-bold">
                          No guests found
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {allTableGuests.length === 0 && table.type !== 'bridal' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300 hover:text-red-400 transition-all"
                  onClick={() => onRemoveTable(table.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-6 pb-6 min-h-[150px]">
          <div className="space-y-1 print:hidden">
            <SortableContext items={visibleGuests.map(g => g.id)} strategy={verticalListSortingStrategy}>
              {visibleGuests.map((guest) => (
                <SortableGuestItem
                  key={guest.id}
                  guest={guest}
                  onQuickMove={onQuickMove}
                  availableTables={availableTables}
                />
              ))}
            </SortableContext>
            {visibleGuests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-300 border-2 border-dashed border-slate-50 rounded-2xl">
                <Users className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Empty Table</span>
              </div>
            )}
          </div>
          <div className="hidden print:block space-y-0.5">
            {allTableGuests.map(g => (
              <div key={g.id} className="text-xs text-slate-700">
                {g.name}{g.is_baby_or_child ? ' (Baby/Child)' : ''}
              </div>
            ))}
            {allTableGuests.length === 0 && (
              <div className="text-xs text-slate-400 italic">No guests assigned</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

DroppableTable.displayName = 'DroppableTable';
