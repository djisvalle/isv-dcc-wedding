import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Users,
  User,
  Crown,
  Star,
  GlassWater,
  Plus,
  Trash2,
  Table as TableIcon,
  UserCheck,
  Search,
  AlertTriangle,
  Printer
} from 'lucide-react';
import {
  DndContext, 
  DragOverlay, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '@/lib/firebase';
import { useGuests } from '@/features/guests/context/GuestsProvider';
import { commitInChunks } from '@/lib/firestoreBatch';
import type { Guest } from '@/features/guests/types';
import { Table, TABLE_TYPES, mergeTables, TABLE_LAYOUT_SETTING_ID, persistTableLayout } from '@/components/admin/tables/types';
import { DEFAULT_CAPACITY, getEffectiveCapacity, getCapacityStatus } from '@/components/admin/tables/capacity';
import { SortableGuestItem } from '@/components/admin/tables/SortableGuestItem';

const EMPTY_GUESTS: Guest[] = [];

// --- Sub-components for DnD ---

const DroppableTable = React.memo<{
  table: Table;
  allTableGuests: Guest[];
  visibleGuests: Guest[];
  hasGuestFilter: boolean;
  onRemoveTable: (id: string) => void;
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  unassignedGuests: Guest[];
  onUpdateCapacity: (tableId: string, capacity: number | undefined) => void;
}>(({ table, allTableGuests, visibleGuests, hasGuestFilter, onRemoveTable, onQuickMove, availableTables, unassignedGuests, onUpdateCapacity }) => {
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

// --- Main Page ---

export default function AdminTables() {
  const { guests: allGuests, loading } = useGuests();
  const [activeTables, setActiveTables] = useState<Table[]>([]);
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTable, setNewTable] = useState<{ type: Table['type']; number: string; capacity: string }>({
    type: 'regular',
    number: '',
    capacity: String(DEFAULT_CAPACITY.regular ?? '')
  });
  
  // Mobile unassigned sheet
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Bulk selection of unassigned guests
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters (drive both the table grid and the guest lists inside it)
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Table['type']>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all'); // 'all' | 'guest' (no role) | an actual role string
  const [capacityFilter, setCapacityFilter] = useState<'all' | 'room' | 'full' | 'over'>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const guests = useMemo(
    () => allGuests.filter(g => g.is_coming === true),
    [allGuests]
  );

  const activeGuest = useMemo(() =>
    activeGuestId ? guests.find(g => g.id === activeGuestId) : null
  , [activeGuestId, guests]);

  useEffect(() => {
    const tablesFromGuests: Record<string, Table> = {};

    // Always ensure a Bridal table exists
    tablesFromGuests['bridal-'] = { id: 'bridal-', type: 'bridal', number: '' };

    guests.forEach(g => {
      if (g.table_type) {
        const key = `${g.table_type}-${g.table_number || ''}`;
        if (!tablesFromGuests[key]) {
          tablesFromGuests[key] = {
            id: key,
            type: g.table_type,
            number: g.table_number || ''
          };
        }
      }
    });

    // Merge with existing active tables (e.g. empty tables loaded from
    // Firestore, or ones created earlier this session) to avoid dropping them.
    setActiveTables(prev => mergeTables(Object.values(tablesFromGuests), prev));
  }, [guests]);

  // Load any previously-saved table layout once on mount, so tables with no
  // guests assigned yet (not derivable from guest docs) survive a refresh.
  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, 'settings', TABLE_LAYOUT_SETTING_ID)).then(snap => {
      if (cancelled || !snap.exists()) return;
      const raw = snap.data().value;
      if (typeof raw !== 'string') return;
      try {
        const saved = JSON.parse(raw);
        if (!Array.isArray(saved)) return;
        setActiveTables(prev => mergeTables(prev, saved));
      } catch {
        // Malformed layout data shouldn't block the page from loading.
      }
    }).catch(err => {
      handleFirestoreError(err, OperationType.GET, `settings/${TABLE_LAYOUT_SETTING_ID}`);
    });
    return () => { cancelled = true; };
  }, []);

  const unassignedGuests = useMemo(() => 
    guests
      .filter(g => !g.table_type)
      .sort((a,b) => (a.table_order || 0) - (b.table_order || 0))
  , [guests]);

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    guests.forEach(g => { if (g.role) roles.add(g.role); });
    return Array.from(roles).sort();
  }, [guests]);

  const matchesGuestFilters = useCallback((g: Guest) => {
    const q = search.toLowerCase();
    const searchMatch = !search ||
      g.name.toLowerCase().includes(q) ||
      (g.nickname ? g.nickname.toLowerCase().includes(q) : false) ||
      (g.role ? g.role.toLowerCase().includes(q) : false);
    const roleMatch = roleFilter === 'all' || (roleFilter === 'guest' ? !g.role : g.role === roleFilter);
    return searchMatch && roleMatch;
  }, [search, roleFilter]);

  const hasGuestFilter = search.trim() !== '' || roleFilter !== 'all';

  const filteredUnassigned = useMemo(() =>
    unassignedGuests.filter(matchesGuestFilters)
  , [unassignedGuests, matchesGuestFilters]);

  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => filteredUnassigned.some(g => g.id === id)));
  }, [filteredUnassigned]);

  const guestsByTable = useMemo(() => {
    const m: Record<string, Guest[]> = {};
    for (const g of guests) {
      if (!g.table_type) continue;
      const key = `${g.table_type}-${g.table_number || ''}`;
      (m[key] ||= []).push(g);
    }
    for (const k in m) m[k].sort((a, b) => (a.table_order || 0) - (b.table_order || 0));
    return m;
  }, [guests]);

  const tableOccupants = useMemo(() => {
    const m: Record<string, number> = {};
    for (const table of activeTables) {
      m[table.id] = (guestsByTable[table.id] ?? EMPTY_GUESTS).filter(g => !g.is_baby_or_child).length;
    }
    return m;
  }, [activeTables, guestsByTable]);

  const visibleTables = useMemo(() =>
    activeTables.filter(table => {
      if (typeFilter !== 'all' && table.type !== typeFilter) return false;

      const tableGuests = guestsByTable[table.id] ?? EMPTY_GUESTS;
      const occupants = tableGuests.filter(g => !g.is_baby_or_child).length;
      const status = getCapacityStatus(occupants, getEffectiveCapacity(table));
      if (capacityFilter !== 'all' && status !== capacityFilter) return false;

      // A table with guests but none matching the active search/role filter
      // hides; an empty table always stays visible (still a valid, useful
      // drop target while searching) as long as type/capacity match.
      if (hasGuestFilter && tableGuests.length > 0 && !tableGuests.some(matchesGuestFilters)) return false;

      return true;
    })
  , [activeTables, guestsByTable, typeFilter, capacityFilter, hasGuestFilter, matchesGuestFilters]);

  const handleQuickMove = useCallback(async (guestId: string, tableId: string | null) => {
    try {
      const guestRef = doc(db, 'guests', guestId);
      
      let targetType: 'bridal' | 'vip' | 'regular' | null = null;
      let targetNumber: string | null = null;

      if (tableId) {
        const table = activeTables.find(t => t.id === tableId);
        if (table) {
          targetType = table.type;
          targetNumber = table.number;
        }
      }

      // Find the last order in the target table to append this guest
      const targetGuests = guests.filter(g => 
        g.table_type === targetType && 
        (g.table_number || '') === (targetNumber || '')
      );
      const maxOrder = targetGuests.length > 0 
        ? Math.max(...targetGuests.map(g => g.table_order || 0)) 
        : -1;

      await updateDoc(guestRef, {
        table_type: targetType || null,
        table_number: targetNumber || null,
        table_order: maxOrder + 1,
        updated_at: serverTimestamp()
      });
      toast.success('Assignment updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${guestId}`);
    }
  }, [guests, activeTables]);

  const handleToggleSelect = useCallback((guestId: string) => {
    setSelectedIds(prev => prev.includes(guestId) ? prev.filter(id => id !== guestId) : [...prev, guestId]);
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds([]), []);

  const handleBulkAssign = useCallback(async (guestIds: string[], tableId: string) => {
    const table = activeTables.find(t => t.id === tableId);
    if (!table || guestIds.length === 0) return;

    try {
      const targetGuests = guests.filter(g =>
        g.table_type === table.type && (g.table_number || '') === (table.number || '')
      );
      let nextOrder = targetGuests.length > 0
        ? Math.max(...targetGuests.map(g => g.table_order || 0)) + 1
        : 0;

      const ops = guestIds.map(id => ({ id, order: nextOrder++ }));
      await commitInChunks(ops, ({ id, order }, batch) => {
        batch.update(doc(db, 'guests', id), {
          table_type: table.type,
          table_number: table.number,
          table_order: order,
          updated_at: serverTimestamp()
        });
      });
      toast.success(`${guestIds.length} guest${guestIds.length === 1 ? '' : 's'} assigned`);
      setSelectedIds([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'guests');
    }
  }, [activeTables, guests]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveGuestId(active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGuestId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeGuest = guests.find(g => g.id === activeId);
    if (!activeGuest) return;

    const overData = over.data.current;
    let targetType: 'bridal' | 'vip' | 'regular' | null = null;
    let targetNumber: string | null = null;

    if (overData?.type === 'table') {
      targetType = overData.table.type;
      targetNumber = overData.table.number;
    } else if (overData?.type === 'guest') {
      targetType = overData.guest.table_type;
      targetNumber = overData.guest.table_number;
    } else if (overId === 'unassigned-container') {
      targetType = null;
      targetNumber = null;
    } else if (overData?.type === 'unassigned') {
      targetType = null;
      targetNumber = null;
    }

    // Get current guests in target table (excluding the one being moved)
    const targetTableGuests = guests
      .filter(g => g.table_type === targetType && (g.table_number || '') === (targetNumber || '') && g.id !== activeId)
      .sort((a, b) => (a.table_order || 0) - (b.table_order || 0));

    // Get unassigned guests (excluding the one being moved)
    const unassignedItems = guests
      .filter(g => !g.table_type && g.id !== activeId)
      .sort((a, b) => (a.table_order || 0) - (b.table_order || 0));

    let newList: Guest[] = [];
    if (targetType || targetNumber) {
      newList = [...targetTableGuests];
    } else {
      newList = [...unassignedItems];
    }

    // Find insertion index
    let overIndex = -1;
    if (overData?.type === 'guest') {
      overIndex = newList.findIndex(g => g.id === overId);
    } else {
      overIndex = newList.length;
    }

    // Insert active guest at the right position
    newList.splice(overIndex >= 0 ? overIndex : newList.length, 0, activeGuest);

    // If something actually changed (either table or position within table)
    const isSameTable = activeGuest.table_type === targetType && (activeGuest.table_number || '') === (targetNumber || '');
    const oldIndexInCurrentTable = guests
      .filter(g => g.table_type === activeGuest.table_type && (g.table_number || '') === (activeGuest.table_number || ''))
      .sort((a, b) => (a.table_order || 0) - (b.table_order || 0))
      .findIndex(g => g.id === activeId);
    
    if (isSameTable && oldIndexInCurrentTable === overIndex) {
      return;
    }

    try {
      const reorderOps = newList.map((g, index) => ({ guest: g, index }));
      await commitInChunks(reorderOps, ({ guest: g, index }, batch) => {
        const guestRef = doc(db, 'guests', g.id);
        const data: Record<string, unknown> = {
          table_order: index,
          updated_at: serverTimestamp()
        };
        // Only if it's the guest we actually moved, or if we need to update their table info
        if (g.id === activeId) {
          data.table_type = targetType;
          data.table_number = targetNumber;
        }
        batch.update(guestRef, data);
      });
      toast.success('Arrangement updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests`);
    }
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `${newTable.type}-${newTable.number}`;
    if (activeTables.find(t => t.id === id)) {
      toast.error('This table already exists');
      return;
    }
    const parsedCapacity = newTable.capacity.trim() === '' ? undefined : parseInt(newTable.capacity, 10);
    const capacity = parsedCapacity !== undefined && !Number.isNaN(parsedCapacity) && parsedCapacity > 0
      ? parsedCapacity
      : undefined;
    const updated = mergeTables(activeTables, [{ id, type: newTable.type, number: newTable.number, capacity }]);
    setActiveTables(updated);
    persistTableLayout(updated);
    setIsAddTableOpen(false);
    setNewTable({ type: 'regular', number: '', capacity: String(DEFAULT_CAPACITY.regular ?? '') });
    toast.success('Table added');
  };

  const handleRemoveTable = useCallback((id: string) => {
    setActiveTables(prev => {
      const updated = prev.filter(t => t.id !== id);
      persistTableLayout(updated);
      return updated;
    });
    toast.success('Table removed');
  }, []);

  const handleUpdateCapacity = useCallback((tableId: string, capacity: number | undefined) => {
    setActiveTables(prev => {
      const updated = prev.map(t => t.id === tableId ? { ...t, capacity } : t);
      persistTableLayout(updated);
      return updated;
    });
  }, []);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wedding-gold"></div>
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1200 pb-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl text-slate-900 mb-2">Table Arrangement</h1>
            <p className="text-slate-500">Drag and drop guests to organize your seating plan</p>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Tables</span>
                <span className="text-2xl font-serif text-wedding-gold">{activeTables.length}</span>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Unassigned</span>
                <span className="text-2xl font-serif text-wedding-gold">{unassignedGuests.length}</span>
              </div>
            </div>

            <Button onClick={handlePrint} variant="outline" className="border-slate-200 rounded-2xl h-12 print:hidden">
              <Printer className="w-4 h-4 mr-2" />
              Print Seating Chart
            </Button>

            <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
              <DialogTrigger
              render={
                <Button className="bg-wedding-gold hover:bg-wedding-gold/80 rounded-2xl h-12 print:hidden">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Table
                </Button>
              }
            />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add a New Table</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddTable} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Table Category</Label>
                    <select 
                      className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={newTable.type}
                      onChange={e => {
                        const type = e.target.value as Table['type'];
                        setNewTable(prev => {
                          const wasAtDefault = prev.capacity === String(DEFAULT_CAPACITY[prev.type] ?? '');
                          return {
                            ...prev,
                            type,
                            capacity: wasAtDefault ? String(DEFAULT_CAPACITY[type] ?? '') : prev.capacity
                          };
                        });
                      }}
                    >
                      {TABLE_TYPES.map(type => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Table Number/Identifier</Label>
                    <Input
                      required={newTable.type !== 'bridal'}
                      disabled={newTable.type === 'bridal'}
                      value={newTable.number}
                      onChange={e => setNewTable(prev => ({ ...prev, number: e.target.value }))}
                      placeholder="e.g., 1, 2, A, B..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newTable.capacity}
                      onChange={e => setNewTable(prev => ({ ...prev, capacity: e.target.value }))}
                      placeholder="Uncapped"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-wedding-gold">Create Table</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end print:hidden">
          <div className="flex-1 min-w-[240px]">
            <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Search</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-11 h-11 bg-white border-none shadow-sm rounded-xl"
                placeholder="Search by name, nickname, or role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Table Type</Label>
            <select
              className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as 'all' | Table['type'])}
            >
              <option value="all">All Types</option>
              {TABLE_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Role</Label>
            <select
              className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="guest">Guest</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Capacity</Label>
            <select
              className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm"
              value={capacityFilter}
              onChange={e => setCapacityFilter(e.target.value as 'all' | 'room' | 'full' | 'over')}
            >
              <option value="all">All Tables</option>
              <option value="room">Has Room</option>
              <option value="full">Full</option>
              <option value="over">Overbooked</option>
            </select>
          </div>

          {(search || typeFilter !== 'all' || roleFilter !== 'all' || capacityFilter !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
                setRoleFilter('all');
                setCapacityFilter('all');
              }}
              className="h-11 px-4 rounded-xl text-slate-500"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar: Unassigned Guests (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 sticky top-6 print:hidden">
            <UnassignedContainer
              guests={filteredUnassigned}
              onQuickMove={handleQuickMove}
              availableTables={activeTables}
              hasFilter={hasGuestFilter}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onClearSelection={handleClearSelection}
              onBulkAssign={handleBulkAssign}
              tableOccupants={tableOccupants}
            />
          </div>

          {/* Floating Action Button for Unassigned on Mobile */}
          <div className="lg:hidden fixed bottom-6 right-6 z-40 print:hidden">
             <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                <SheetTrigger 
                  render={
                    <Button className="h-14 w-14 rounded-full shadow-2xl bg-wedding-gold hover:bg-wedding-gold/90 flex items-center justify-center p-0">
                      <div className="relative">
                        <Users className="w-6 h-6 text-white" />
                        {unassignedGuests.length > 0 && (
                          <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-white">
                            {unassignedGuests.length}
                          </span>
                        )}
                      </div>
                    </Button>
                  }
                />
                <SheetContent side="right" className="w-[85vw] sm:max-w-md p-0 rounded-l-3xl overflow-hidden border-none shadow-2xl">
                  <div className="h-full bg-slate-50">
                    <UnassignedContainer
                      guests={filteredUnassigned}
                      onQuickMove={(guestId, tableId) => {
                        handleQuickMove(guestId, tableId);
                        setIsMobileSheetOpen(false);
                      }}
                      availableTables={activeTables}
                      hasFilter={hasGuestFilter}
                      isMobile
                      selectedIds={selectedIds}
                      onToggleSelect={handleToggleSelect}
                      onClearSelection={handleClearSelection}
                      onBulkAssign={handleBulkAssign}
                      tableOccupants={tableOccupants}
                    />
                  </div>
                </SheetContent>
             </Sheet>
          </div>

          {/* Main Area: Tables */}
          <div className="lg:col-span-3 print:col-span-4">
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
              {visibleTables.map((table) => {
                const allTableGuests = guestsByTable[table.id] ?? EMPTY_GUESTS;
                const visibleGuests = hasGuestFilter ? allTableGuests.filter(matchesGuestFilters) : allTableGuests;
                return (
                  <DroppableTable
                    key={table.id}
                    table={table}
                    allTableGuests={allTableGuests}
                    visibleGuests={visibleGuests}
                    hasGuestFilter={hasGuestFilter}
                    onRemoveTable={handleRemoveTable}
                    onQuickMove={handleQuickMove}
                    availableTables={activeTables}
                    unassignedGuests={unassignedGuests}
                    onUpdateCapacity={handleUpdateCapacity}
                  />
                );
              })}

              {activeTables.length === 0 && (
                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
                  <TableIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-serif text-xl mb-1 text-slate-600">No tables created yet</p>
                  <p className="text-sm">Click "Add Table" to start organizing</p>
                </div>
              )}

              {activeTables.length > 0 && visibleTables.length === 0 && (
                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
                  <Search className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-serif text-xl mb-1 text-slate-600">No tables match your filters</p>
                  <Button
                    variant="ghost"
                    className="mt-2 text-wedding-gold"
                    onClick={() => { setSearch(''); setTypeFilter('all'); setRoleFilter('all'); setCapacityFilter('all'); }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeGuest ? (
          <SortableGuestItem 
            guest={activeGuest} 
            isOverlay 
            // availableTables={activeTables} // Not needed for overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const UnassignedContainer: React.FC<{
  guests: Guest[];
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  hasFilter: boolean;
  isMobile?: boolean;
  selectedIds: string[];
  onToggleSelect: (guestId: string) => void;
  onClearSelection: () => void;
  onBulkAssign: (guestIds: string[], tableId: string) => void;
  tableOccupants: Record<string, number>;
}> = ({ guests, onQuickMove, availableTables, hasFilter, isMobile = false, selectedIds, onToggleSelect, onClearSelection, onBulkAssign, tableOccupants }) => {
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
