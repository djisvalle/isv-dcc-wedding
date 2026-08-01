import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  Users,
  Plus,
  Table as TableIcon,
  Search,
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
  sortableKeyboardCoordinates
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
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '@/lib/firebase';
import { useGuests } from '@/features/guests/context/GuestsProvider';
import { commitInChunks } from '@/lib/firestoreBatch';
import type { Guest } from '@/features/guests/types';
import { Table, TABLE_TYPES, mergeTables, TABLE_LAYOUT_SETTING_ID, persistTableLayout } from '@/components/admin/tables/types';
import { DEFAULT_CAPACITY, getEffectiveCapacity, getCapacityStatus } from '@/components/admin/tables/capacity';
import { SortableGuestItem } from '@/components/admin/tables/SortableGuestItem';
import { DroppableTable } from '@/components/admin/tables/DroppableTable';
import { UnassignedContainer } from '@/components/admin/tables/UnassignedContainer';

const EMPTY_GUESTS: Guest[] = [];

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
                  <div key={table.id} className="animate-in fade-in duration-300">
                    <DroppableTable
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
                  </div>
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
