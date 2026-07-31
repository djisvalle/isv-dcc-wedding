import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Users, 
  User, 
  Crown, 
  Star, 
  GlassWater, 
  Plus, 
  GripVertical,
  Trash2,
  Table as TableIcon,
  UserCheck,
  Search,
  UserX
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
import { CSS } from '@dnd-kit/utilities';
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

interface Guest {
  id: string;
  name: string;
  nickname?: string;
  table_type?: 'bridal' | 'vip' | 'regular';
  table_number?: string;
  table_order?: number;
  role?: string;
  is_coming?: boolean | null;
  is_baby_or_child?: boolean;
}

interface Table {
  id: string; // key: type-number
  type: 'bridal' | 'vip' | 'regular';
  number: string;
}

const TABLE_TYPES = [
  { id: 'bridal', label: 'Bridal Table' },
  { id: 'vip', label: 'VIP Table' },
  { id: 'regular', label: 'Regular Table' }
] as const;

// --- Sub-components for DnD ---

const SortableGuestItem: React.FC<{ 
  guest: Guest; 
  isOverlay?: boolean;
  onQuickMove?: (guestId: string, tableId: string | null) => void;
  availableTables?: Table[];
}> = ({ guest, isOverlay = false, onQuickMove, availableTables = [] }) => {
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
            <DropdownMenu>
            <DropdownMenuTrigger 
              render={
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3" />
                </Button>
              }
            />
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      {guest.nickname && (
        <span className="text-[10px] text-slate-400 italic mt-0.5 ml-5 truncate">"{guest.nickname}"</span>
      )}
    </div>
  );
};

const DroppableTable: React.FC<{ 
  table: Table; 
  tableGuests: Guest[]; 
  onRemoveTable: (id: string) => void;
  onQuickMove: (guestId: string, tableId: string | null) => void;
  availableTables: Table[];
  unassignedGuests: Guest[];
}> = ({ table, tableGuests, onRemoveTable, onQuickMove, availableTables, unassignedGuests }) => {
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

  const countOccupants = tableGuests.filter(g => !g.is_baby_or_child).length;

  return (
    <div ref={setNodeRef} className="h-full">
      <Card className={`
        h-full border-slate-200/60 shadow-sm transition-all rounded-3xl overflow-hidden group
        ${isOver ? 'ring-2 ring-wedding-gold scale-[1.02] bg-wedding-gold/5' : ''}
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
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  {countOccupants} {countOccupants === 1 ? 'Guest' : 'Guests'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
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

              {tableGuests.length === 0 && table.type !== 'bridal' && (
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
          <div className="space-y-1">
            <SortableContext items={tableGuests.map(g => g.id)} strategy={verticalListSortingStrategy}>
              {tableGuests.map((guest) => (
                <SortableGuestItem 
                  key={guest.id} 
                  guest={guest} 
                  onQuickMove={onQuickMove}
                  availableTables={availableTables}
                />
              ))}
            </SortableContext>
            {tableGuests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-300 border-2 border-dashed border-slate-50 rounded-2xl">
                <Users className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Empty Table</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Main Page ---

export default function AdminTables() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTables, setActiveTables] = useState<Table[]>([]);
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTable, setNewTable] = useState<{ type: 'bridal' | 'vip' | 'regular', number: string }>({ type: 'regular', number: '' });
  
  // Mobile unassigned sheet
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Search state for unassigned guests
  const [guestSearch, setGuestSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeGuest = useMemo(() => 
    activeGuestId ? guests.find(g => g.id === activeGuestId) : null
  , [activeGuestId, guests]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'guests'), (snap) => {
      const guestData = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Guest))
        .filter(g => g.is_coming === true);
      setGuests(guestData);

      // Derive initial tables from guest assignments
      const tablesFromGuests: Record<string, Table> = {};
      
      // Always ensure a Bridal table exists
      tablesFromGuests['bridal-'] = { id: 'bridal-', type: 'bridal', number: '' };

      guestData.forEach(g => {
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
      
      setActiveTables(prev => {
        // Merge with existing active tables to preserve newly created empty tables
        const combined = { ...tablesFromGuests };
        prev.forEach(t => {
          if (!combined[t.id]) combined[t.id] = t;
        });
        
        return Object.values(combined).sort((a,b) => {
           const order = ['bridal', 'vip', 'regular'];
           const aOrder = order.indexOf(a.type);
           const bOrder = order.indexOf(b.type);
           if (aOrder !== bOrder) return aOrder - bOrder;
           return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
        });
      });

      setLoading(false);
    });
    return () => unsub();
  }, []);

  const unassignedGuests = useMemo(() => 
    guests
      .filter(g => !g.table_type)
      .sort((a,b) => (a.table_order || 0) - (b.table_order || 0))
  , [guests]);

  const filteredUnassigned = useMemo(() => 
    unassignedGuests.filter(g => 
      g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
      (g.nickname && g.nickname.toLowerCase().includes(guestSearch.toLowerCase())) ||
      (g.role && g.role.toLowerCase().includes(guestSearch.toLowerCase()))
    )
  , [unassignedGuests, guestSearch]);

  const handleQuickMove = async (guestId: string, tableId: string | null) => {
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
  };

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
      // Update all guests in the target list with their NEW order
      const updatePromises = newList.map((g, index) => {
        const guestRef = doc(db, 'guests', g.id);
        const data: any = {
          table_order: index,
          updated_at: serverTimestamp()
        };
        // Only if it's the guest we actually moved, or if we need to update their table info
        if (g.id === activeId) {
          data.table_type = targetType;
          data.table_number = targetNumber;
        }
        return updateDoc(guestRef, data);
      });

      await Promise.all(updatePromises);
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
    setActiveTables(prev => {
      const updated = [...prev, { id, ...newTable }];
      return updated.sort((a,b) => {
           const order = ['bridal', 'vip', 'regular'];
           const aOrder = order.indexOf(a.type);
           const bOrder = order.indexOf(b.type);
           if (aOrder !== bOrder) return aOrder - bOrder;
           return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
      });
    });
    setIsAddTableOpen(false);
    setNewTable({ type: 'regular', number: '' });
    toast.success('Table added');
  };

  const handleRemoveTable = (id: string) => {
    setActiveTables(prev => prev.filter(t => t.id !== id));
    toast.success('Table removed');
  };

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
            <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
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

            <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
              <DialogTrigger 
              render={
                <Button className="bg-wedding-gold hover:bg-wedding-gold/80 rounded-2xl h-12">
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
                      onChange={e => setNewTable(prev => ({ ...prev, type: e.target.value as any }))}
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
                  <Button type="submit" className="w-full bg-wedding-gold">Create Table</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar: Unassigned Guests (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 sticky top-6">
            <UnassignedContainer 
              guests={filteredUnassigned} 
              onQuickMove={handleQuickMove}
              availableTables={activeTables}
              search={guestSearch}
              onSearchChange={setGuestSearch}
            />
          </div>

          {/* Floating Action Button for Unassigned on Mobile */}
          <div className="lg:hidden fixed bottom-6 right-6 z-40">
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
                      search={guestSearch}
                      onSearchChange={setGuestSearch}
                      isMobile
                    />
                  </div>
                </SheetContent>
             </Sheet>
          </div>

          {/* Main Area: Tables */}
          <div className="lg:col-span-3">
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeTables.map((table) => (
                <DroppableTable 
                  key={table.id} 
                  table={table} 
                  tableGuests={guests
                    .filter(g => g.table_type === table.type && (g.table_number || '') === (table.number || ''))
                    .sort((a,b) => (a.table_order || 0) - (b.table_order || 0))}
                  onRemoveTable={handleRemoveTable}
                  onQuickMove={handleQuickMove}
                  availableTables={activeTables}
                  unassignedGuests={unassignedGuests}
                />
              ))}
              
              {activeTables.length === 0 && (
                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
                  <TableIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-serif text-xl mb-1 text-slate-600">No tables created yet</p>
                  <p className="text-sm">Click "Add Table" to start organizing</p>
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
  search: string;
  onSearchChange: (val: string) => void;
  isMobile?: boolean;
}> = ({ guests, onQuickMove, availableTables, search, onSearchChange, isMobile = false }) => {
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-xl text-slate-800">Unassigned</h3>
        <span className="text-[10px] px-2 py-1 bg-white text-slate-400 rounded-full border border-slate-100 font-bold">
          {guests.length}
        </span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input 
          className="pl-9 h-10 bg-white border-none shadow-sm rounded-xl text-xs" 
          placeholder="Search name..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1">
        <SortableContext items={guests.map(g => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {guests.map((guest) => (
              <SortableGuestItem 
                key={guest.id} 
                guest={guest} 
                onQuickMove={onQuickMove}
                availableTables={availableTables}
              />
            ))}
            {guests.length === 0 && (
              <div className="text-center py-12 text-slate-300">
                <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-10" />
                <p className="text-xs uppercase tracking-widest font-bold">Done!</p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
