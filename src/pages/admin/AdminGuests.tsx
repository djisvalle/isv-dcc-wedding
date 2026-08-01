import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, Search, Loader2, UserCheck, UserX, UserMinus, Plus, Trash2, Upload, FileSpreadsheet, ArrowUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  DocumentSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuests } from '@/features/guests/context/GuestsProvider';
import { useInvites } from '@/features/invites/context/InvitesProvider';
import { batchDeleteGuests, batchUpdateGuestStatus, batchImportGuests } from '@/features/guests/api/guestsApi';
import { useDebounce } from '@/hooks/useDebounce';
import { GuestRow } from '@/components/admin/guests/GuestRow';
import type { Guest } from '@/features/guests/types';

const TABLE_TYPES = [
  { id: 'bridal', label: 'Bridal Table' },
  { id: 'vip', label: 'VIP Table' },
  { id: 'regular', label: 'Regular Table' }
];

const GUEST_ROLES = [
  'Groom',
  'Bride',
  'Mother of the Groom',
  'Father of the Bride',
  'Mother of the Bride',
  'Principal Sponsor',
  'Secondary Sponsor',
  'Best Man',
  'Maid of Honor',
  'Groomsman',
  'Bridesmaid'
];

const ROLE_PRIORITY: Record<string, number> = {
  'Groom': 1,
  'Bride': 2,
  'Mother of the Groom': 3,
  'Father of the Bride': 4,
  'Mother of the Bride': 4,
  'Principal Sponsor': 5,
  'Principal': 5,
  'Secondary Sponsor': 6,
  'Secondary': 6,
  'Best Man': 7,
  'Maid of Honor': 8,
  'MOH': 8,
  'Groomsman': 9,
  'Bridesmaid': 10,
  'Guest': 11
};

export default function AdminGuests() {
  const { guests, loading } = useGuests();
  const { invites } = useInvites();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<keyof Guest | 'invite_name'>('import_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'attending' | 'declined' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');

  // Searchable dropdown states
  const [invitePopoverOpen, setInvitePopoverOpen] = useState(false);
  const [parentPopoverOpen, setParentPopoverOpen] = useState(false);
  const [editInvitePopoverOpen, setEditInvitePopoverOpen] = useState(false);
  const [editParentPopoverOpen, setEditParentPopoverOpen] = useState(false);

  // New guest state
  const [newGuest, setNewGuest] = useState({ 
    name: '', 
    nickname: '', 
    role: '', 
    invite_id: '',
    table_type: '' as any,
    table_number: '',
    is_baby_or_child: false,
    parent_name: ''
  });

  useEffect(() => {
    getDoc(doc(db, 'settings', 'invite_message_template')).then((snap: DocumentSnapshot) => {
      if (snap.exists()) {
        setMessageTemplate(snap.data().value);
      }
    });
  }, []);

  const copyMessage = useCallback((guest: Guest) => {
    const inviteGroup = invites.find(i => i.id === guest.invite_id);
    const displayName = inviteGroup?.name || guest.nickname || guest.name;
    const link = `${window.location.origin}/?inviteUrl=${guest.invite_id || guest.id}`;
    const message = messageTemplate
      .replace('<name>', displayName)
      .replace('<link>', link);
    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard');
  }, [invites, messageTemplate]);

  const handleExport = () => {
    try {
      const data = guests.map(g => ({
        Name: g.name,
        Nickname: g.nickname || '',
        Role: g.role || 'Guest',
        Group: invites.find(i => i.id === g.invite_id)?.name || 'Unassigned',
        InviteID: g.invite_id || g.id,
        TableType: g.table_type || 'N/A',
        TableNumber: g.table_number || 'N/A',
        Response: g.is_coming === true ? 'Attending' : g.is_coming === false ? 'Declined' : 'Pending',
        LastUpdated: g.updated_at ? (g.updated_at.seconds ? new Date(g.updated_at.seconds * 1000).toLocaleString() : new Date(g.updated_at).toLocaleString()) : 'N/A'
      }));

      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Guests');
      xlsx.writeFile(workbook, 'wedding_guest_list.xlsx');
      toast.success('Guest list exported successfully');
    } catch {
      toast.error('Failed to export guest list');
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const maxOrder = guests.length > 0 
        ? Math.max(...guests.map(g => g.import_order || 0)) 
        : -1;

      await addDoc(collection(db, 'guests'), {
        name: newGuest.name,
        nickname: newGuest.nickname || null,
        role: newGuest.role || null,
        invite_id: newGuest.invite_id || null,
        table_type: newGuest.table_type || null,
        table_number: newGuest.table_number || null,
        is_baby_or_child: newGuest.is_baby_or_child || false,
        parent_name: newGuest.parent_name || null,
        is_coming: null,
        import_order: maxOrder + 1,
        updated_at: serverTimestamp()
      });
      toast.success('Guest added successfully');
      setNewGuest({ name: '', nickname: '', role: '', invite_id: '', table_type: '' as any, table_number: '', is_baby_or_child: false, parent_name: '' });
      setIsAddOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'guests');
      toast.error('Failed to add guest');
    }
  };

  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;
    try {
      await updateDoc(doc(db, 'guests', editingGuest.id), {
        role: editingGuest.role || null,
        invite_id: editingGuest.invite_id || null,
        table_type: editingGuest.table_type || null,
        table_number: editingGuest.table_number || null,
        is_baby_or_child: editingGuest.is_baby_or_child || false,
        parent_name: editingGuest.parent_name || null,
        updated_at: serverTimestamp()
      });
      toast.success('Guest updated successfully');
      setIsEditOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${editingGuest.id}`);
      toast.error('Failed to update guest');
    }
  };

  const handleDeleteGuest = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'guests', id));
      toast.success('Guest deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `guests/${id}`);
      toast.error('Failed to delete guest');
    }
  }, []);

  const handleEditClick = useCallback((guest: Guest) => {
    setEditingGuest(guest);
    setIsEditOpen(true);
  }, []);

  const onUpdateField = useCallback(async (id: string, field: 'name' | 'nickname', value: string) => {
    try {
      await updateDoc(doc(db, 'guests', id), {
        [field]: field === 'nickname' && !value ? null : value,
        updated_at: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${id}`);
      toast.error(`Failed to update ${field}`);
    }
  }, []);

  const handleBulkDelete = async () => {
    try {
      await batchDeleteGuests(selectedIds);
      toast.success('Guests deleted successfully');
      setSelectedIds([]);
    } catch {
      toast.error('Failed to delete guests');
    }
  };

  const handleUpdateStatus = useCallback(async (ids: string[], status: boolean | null) => {
    try {
      await batchUpdateGuestStatus(ids, status);
      toast.success('Status updated successfully');
      if (ids.length > 1) setSelectedIds([]);
    } catch {
      toast.error('Failed to update status');
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = xlsx.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet) as any[];

        await batchImportGuests(
          rows
            .filter(row => row.name)
            .map(row => ({ name: row.name, role: row.role || null, invite_id: row.inviteId || null }))
        );
        toast.success('Successfully imported guest list');
        setIsUploadOpen(false);
      };
      reader.readAsArrayBuffer(file);
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    }
  } as any);

  const debouncedSearch = useDebounce(search, 300);

  const sortedGuests = useMemo(() => {
    const guestsWithInviteName = guests.map(g => ({
      ...g,
      invite_name: invites.find(i => i.id === g.invite_id)?.name
    }));

    const filteredGuests = guestsWithInviteName.filter(g => {
      const searchMatch = (g.name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
        (g.nickname?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
        (g.invite_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
        (g.role?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

      const statusMatch = statusFilter === 'all' ||
        (statusFilter === 'attending' && g.is_coming === true) ||
        (statusFilter === 'declined' && g.is_coming === false) ||
        (statusFilter === 'pending' && g.is_coming === null);

      const roleMatch = roleFilter === 'all' || g.role === roleFilter || (roleFilter === 'guest' && !g.role);

      const tableMatch = tableFilter === 'all' ||
        (tableFilter === 'assigned' && g.table_type) ||
        (tableFilter === 'unassigned' && !g.table_type) ||
        g.table_type === tableFilter;

      return searchMatch && statusMatch && roleMatch && tableMatch;
    });

    return [...filteredGuests].sort((a, b) => {
      if (sortField === 'role') {
        const aPriority = a.role ? (ROLE_PRIORITY[a.role] || 99) : 11;
        const bPriority = b.role ? (ROLE_PRIORITY[b.role] || 99) : 11;

        if (aPriority !== bPriority) {
          return sortDirection === 'asc' ? aPriority - bPriority : bPriority - aPriority;
        }
        return a.name.localeCompare(b.name);
      }

      const aVal = a[sortField as keyof Guest] ?? 0;
      const bVal = b[sortField as keyof Guest] ?? 0;

      let comparison = 0;

      if (sortField === 'updated_at') {
        const aTime = (a.updated_at?.seconds || 0);
        const bTime = (b.updated_at?.seconds || 0);
        comparison = aTime - bTime;
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        comparison = aStr.localeCompare(bStr);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [guests, invites, debouncedSearch, statusFilter, roleFilter, tableFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedGuests.length / itemsPerPage);
  const paginatedGuests = sortedGuests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: keyof Guest | 'invite_name') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedGuests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedGuests.map(g => g.id));
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif mb-2">Guest List</h1>
          <p className="text-slate-500 text-sm">Detailed overview of all individual RSVP responses.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={() => handleUpdateStatus(selectedIds, true)} variant="outline" className="text-emerald-600 border-emerald-100 hover:bg-emerald-50">
                <UserCheck className="w-4 h-4 mr-2" />
                Attend ({selectedIds.length})
              </Button>
              <Button onClick={() => handleUpdateStatus(selectedIds, false)} variant="outline" className="text-rose-500 border-rose-100 hover:bg-rose-50">
                <UserX className="w-4 h-4 mr-2" />
                Decline ({selectedIds.length})
              </Button>
              <Button onClick={() => handleUpdateStatus(selectedIds, null)} variant="outline" className="text-slate-400 border-slate-100 hover:bg-slate-50">
                <UserMinus className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button onClick={handleBulkDelete} variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger 
              render={
                <Button className="bg-wedding-gold hover:bg-wedding-gold/80">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Guest
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Guest</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddGuest} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input 
                      required 
                      value={newGuest.name} 
                      onChange={e => setNewGuest(prev => ({ ...prev, name: e.target.value }))} 
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nickname</Label>
                    <Input 
                      value={newGuest.nickname} 
                      onChange={e => setNewGuest(prev => ({ ...prev, nickname: e.target.value }))} 
                      placeholder="e.g., JD"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select 
                    className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={newGuest.role} 
                    onChange={e => setNewGuest(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="">None</option>
                    {GUEST_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="is_baby_or_child_add"
                    checked={newGuest.is_baby_or_child}
                    onCheckedChange={(checked) => setNewGuest(prev => ({ ...prev, is_baby_or_child: checked as boolean }))}
                  />
                  <Label htmlFor="is_baby_or_child_add">Is Baby/Child</Label>
                </div>
                {newGuest.is_baby_or_child && (
                  <div className="space-y-2 flex flex-col">
                    <Label>Parent Name</Label>
                    <Popover open={parentPopoverOpen} onOpenChange={setParentPopoverOpen}>
                      <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal h-10 px-3 bg-white border-slate-200"
                          >
                            {newGuest.parent_name || "Select parent..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search guest..." />
                          <CommandList>
                            <CommandEmpty>No guest found.</CommandEmpty>
                            <CommandGroup>
                              {guests.map((guest) => (
                                <CommandItem
                                  key={guest.id}
                                  value={guest.name}
                                  onSelect={() => {
                                    setNewGuest(prev => ({ ...prev, parent_name: guest.name }));
                                    setParentPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      newGuest.parent_name === guest.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {guest.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                <div className="space-y-2 flex flex-col">
                  <Label>Invitation Group (Optional)</Label>
                  <Popover open={invitePopoverOpen} onOpenChange={setInvitePopoverOpen}>
                    <PopoverTrigger 
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={invitePopoverOpen}
                          className="w-full justify-between font-normal h-10 px-3 bg-white border-slate-200"
                        >
                          {newGuest.invite_id
                            ? invites.find((invite) => invite.id === newGuest.invite_id)?.name
                            : "Select invitation group..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      }
                    />
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search group..." />
                        <CommandList>
                          <CommandEmpty>No group found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="unassigned"
                              onSelect={() => {
                                setNewGuest(prev => ({ ...prev, invite_id: '' }));
                                setInvitePopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newGuest.invite_id === "" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Unassigned
                            </CommandItem>
                            {invites.map((invite) => (
                              <CommandItem
                                key={invite.id}
                                value={invite.name}
                                onSelect={() => {
                                  setNewGuest(prev => ({ ...prev, invite_id: invite.id }));
                                  setInvitePopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newGuest.invite_id === invite.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {invite.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Table Category</Label>
                    <select 
                      className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={newGuest.table_type || ''} 
                      onChange={e => setNewGuest(prev => ({ ...prev, table_type: e.target.value as any }))}
                    >
                      <option value="">No Table Assigned</option>
                      {TABLE_TYPES.map(type => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Table Number/Identifier</Label>
                    <Input 
                      value={newGuest.table_number || ''} 
                      onChange={e => setNewGuest(prev => ({ ...prev, table_number: e.target.value }))} 
                      placeholder="e.g., 1 or A"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-wedding-gold">Create Guest</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger 
              render={
                <Button variant="outline" className="border-slate-200">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Import Guests from Excel</DialogTitle>
              </DialogHeader>
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
                  isDragActive ? 'border-wedding-gold bg-wedding-gold/5' : 'border-slate-200 hover:border-wedding-gold/40'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center">
                  {uploading ? (
                    <Loader2 className="w-12 h-12 text-wedding-gold animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-4" />
                  )}
                  <p className="text-sm font-medium text-slate-600">
                    {uploading ? 'Processing file...' : isDragActive ? 'Drop it here!' : 'Click or drag Excel file here'}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">Required columns: name. Optional: role, inviteId</p>
                </div>
              </div>
              <div className="flex justify-center">
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={async () => {
                    const workbook = new ExcelJS.Workbook();
                    const worksheet = workbook.addWorksheet('Template');

                    // Define columns
                    worksheet.columns = [
                      { header: 'name', key: 'name', width: 25 },
                      { header: 'role', key: 'role', width: 20 },
                      { header: 'inviteId', key: 'inviteId', width: 20 },
                    ];

                    // Add some sample data
                    const sampleData = [
                      { name: "John Smith", role: "Groomsman", inviteId: "smith-family" },
                      { name: "Jane Smith", role: "Bridesmaid", inviteId: "smith-family" }
                    ];
                    worksheet.addRows(sampleData);

                    // Add data validation for the role column (Column B)
                    // Apply to a reasonable number of rows
                    for (let i = 2; i <= 200; i++) {
                      worksheet.getCell(`B${i}`).dataValidation = {
                        type: 'list',
                        allowBlank: true,
                        formulae: [`"${GUEST_ROLES.join(',')}"`],
                        showErrorMessage: true,
                        errorStyle: 'error',
                        errorTitle: 'Invalid Role',
                        error: 'Please select a role from the list.'
                      };
                    }

                    // Generate buffer and download
                    const buffer = await workbook.xlsx.writeBuffer();
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = window.URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = 'guests_template.xlsx';
                    anchor.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="text-wedding-gold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleExport} variant="outline" className="border-slate-200">
            <Download className="w-4 h-4 mr-2" />
            Export XLSX
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            className="pl-11 h-12 bg-white border-none shadow-sm rounded-2xl" 
            placeholder="Search by name, nickname, role, or group..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-col gap-1.5 min-w-[150px]">
             <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">RSVP Status</Label>
              <select
                className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Responses</option>
                <option value="attending">Attending</option>
                <option value="declined">Declined</option>
                <option value="pending">Pending</option>
              </select>
          </div>
          
          <div className="flex flex-col gap-1.5 min-w-[150px]">
             <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Role</Label>
              <select
                className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Roles</option>
                <option value="guest">Guest</option>
                {GUEST_ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[150px]">
             <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Table</Label>
              <select
                className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm"
                value={tableFilter}
                onChange={(e) => {
                  setTableFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Tables</option>
                <option value="assigned">Has Table</option>
                <option value="unassigned">No Table</option>
                <option value="bridal">Bridal Table</option>
                <option value="vip">VIP Tables</option>
                <option value="regular">Regular Tables</option>
              </select>
          </div>

          <div className="flex flex-col gap-1.5">
             <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Page Size</Label>
              <select
                className="h-11 px-4 rounded-xl border-none shadow-sm bg-white text-sm focus:ring-2 focus:ring-wedding-gold"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
          </div>

          {(search || statusFilter !== 'all' || roleFilter !== 'all' || tableFilter !== 'all') && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1 invisible">Clear</Label>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setRoleFilter('all');
                  setTableFilter('all');
                  setCurrentPage(1);
                }}
                className="h-11 px-4 rounded-xl text-slate-500"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-12 px-8">
                <Checkbox 
                  checked={selectedIds.length === paginatedGuests.length && paginatedGuests.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead 
                className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 cursor-pointer hover:text-wedding-gold transition-colors"
                onClick={() => handleSort('import_order')}
              >
                <div className="flex items-center gap-2">
                  #
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead 
                className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 cursor-pointer hover:text-wedding-gold transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Guest
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400">Invite Link</TableHead>
              <TableHead 
                className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 cursor-pointer hover:text-wedding-gold transition-colors"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center gap-2">
                  Role
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead 
                className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 cursor-pointer hover:text-wedding-gold transition-colors"
                onClick={() => handleSort('invite_name')}
              >
                <div className="flex items-center gap-2">
                  Group
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead 
                className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 cursor-pointer hover:text-wedding-gold transition-colors"
                onClick={() => handleSort('is_coming')}
              >
                <div className="flex items-center gap-2">
                  Response
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-wedding-gold opacity-20" />
                </TableCell>
              </TableRow>
            ) : paginatedGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center text-slate-400">
                  No guests found.
                </TableCell>
              </TableRow>
            ) : paginatedGuests.map((guest) => (
              <GuestRow
                key={guest.id}
                guest={guest}
                selected={selectedIds.includes(guest.id)}
                onToggleSelect={toggleSelect}
                onUpdateStatus={handleUpdateStatus}
                onUpdateField={onUpdateField}
                onEdit={handleEditClick}
                onDelete={handleDeleteGuest}
                onCopyMessage={copyMessage}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedGuests.length)}</span> of <span className="font-medium">{sortedGuests.length}</span> guests
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="bg-white"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] md:max-w-none">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "bg-wedding-gold hover:bg-wedding-gold/80" : "bg-white"}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="bg-white"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="data-[side=right]:sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit {editingGuest?.name}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleEditGuest} className="space-y-4 px-4 pb-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label>Role</Label>
              <select 
                className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={editingGuest?.role || ''} 
                onChange={e => setEditingGuest(prev => prev ? ({ ...prev, role: e.target.value }) : null)}
              >
                <option value="">None</option>
                {GUEST_ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="is_baby_or_child_edit"
                checked={editingGuest?.is_baby_or_child || false}
                onCheckedChange={(checked) => setEditingGuest(prev => prev ? ({ ...prev, is_baby_or_child: checked as boolean }) : null)}
              />
              <Label htmlFor="is_baby_or_child_edit">Is Baby/Child</Label>
            </div>
            {editingGuest?.is_baby_or_child && (
                <div className="space-y-2 flex flex-col">
                  <Label>Parent Name</Label>
                  <Popover open={editParentPopoverOpen} onOpenChange={setEditParentPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal h-10 px-3 bg-white border-slate-200"
                        >
                          {editingGuest?.parent_name || "Select parent..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search guest..." />
                        <CommandList>
                          <CommandEmpty>No guest found.</CommandEmpty>
                          <CommandGroup>
                            {guests.map((guest) => (
                              <CommandItem
                                key={guest.id}
                                value={guest.name}
                                onSelect={() => {
                                  setEditingGuest(prev => prev ? ({ ...prev, parent_name: guest.name }) : null);
                                  setEditInvitePopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    editingGuest?.parent_name === guest.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {guest.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
            )}
            <div className="space-y-2 flex flex-col">
              <Label>Invitation Group</Label>
              <Popover open={editInvitePopoverOpen} onOpenChange={setEditInvitePopoverOpen}>
                <PopoverTrigger 
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={editInvitePopoverOpen}
                      className="w-full justify-between font-normal h-10 px-3 bg-white border-slate-200"
                    >
                      {editingGuest?.invite_id
                        ? invites.find((invite) => invite.id === editingGuest.invite_id)?.name
                        : "Select invitation group..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search group..." />
                    <CommandList>
                      <CommandEmpty>No group found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="unassigned"
                          onSelect={() => {
                            setEditingGuest(prev => prev ? ({ ...prev, invite_id: '' }) : null);
                            setEditInvitePopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              editingGuest?.invite_id === "" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Unassigned
                        </CommandItem>
                        {invites.map((invite) => (
                          <CommandItem
                            key={invite.id}
                            value={invite.name}
                            onSelect={() => {
                              setEditingGuest(prev => prev ? ({ ...prev, invite_id: invite.id }) : null);
                              setEditInvitePopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                editingGuest?.invite_id === invite.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {invite.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Table Category</Label>
                <select 
                  className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={editingGuest?.table_type || ''} 
                  onChange={e => setEditingGuest(prev => prev ? ({ ...prev, table_type: e.target.value as any }) : null)}
                >
                  <option value="">No Table Assigned</option>
                  {TABLE_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Table Number/Identifier</Label>
                <Input 
                  value={editingGuest?.table_number || ''} 
                  onChange={e => setEditingGuest(prev => prev ? { ...prev, table_number: e.target.value } : null)} 
                  placeholder="e.g., 1 or A"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-wedding-gold">Save Changes</Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
