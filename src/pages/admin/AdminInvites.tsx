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
import { Upload, Download, FileSpreadsheet, Loader2, Search, Plus, Trash2, UserPlus, X, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  DocumentSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { generateInviteId } from '@/lib/utils';
import { commitInChunks } from '@/lib/firestoreBatch';
import { parseExcelRows, downloadExcel } from '@/lib/excel';
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
import { createInviteWithGuests, deleteInviteAndUnassignGuests } from '@/features/invites/api/invitesApi';
import { useDebounce } from '@/hooks/useDebounce';
import { InviteRow } from '@/components/admin/invites/InviteRow';
import type { Guest } from '@/features/guests/types';
import type { Invite, InviteWithCounts } from '@/features/invites/types';

export default function AdminInvites() {
  const { guests } = useGuests();
  const { invites, loading } = useInvites();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'partial' | 'empty'>('all');
  const [uploading, setUploading] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<keyof InviteWithCounts>('import_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [newInvite, setNewInvite] = useState({ id: '', name: '' });
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'invite_message_template')).then((snap: DocumentSnapshot) => {
      if (snap.exists()) {
        setMessageTemplate(snap.data().value);
      }
    });
  }, []);

  const unassignedGuests = useMemo(() => guests.filter(g => !g.invite_id), [guests]);

  const inviteGuests = useMemo(() => {
    if (!editingInvite) return [];
    return guests
      .filter(g => g.invite_id === editingInvite.id)
      .sort((a, b) => (a.import_order || 0) - (b.import_order || 0));
  }, [guests, editingInvite]);

  const handleClearAllData = async () => {
    setClearing(true);
    try {
      const guestSnap = await getDocs(collection(db, 'guests'));
      const inviteSnap = await getDocs(collection(db, 'invites'));

      await commitInChunks(guestSnap.docs, (d, batch) => {
        batch.delete(doc(db, 'guests', d.id));
      });
      await commitInChunks(inviteSnap.docs, (d, batch) => {
        batch.delete(doc(db, 'invites', d.id));
      });

      toast.success('All data has been cleared successfully');
      setIsClearOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rows = await parseExcelRows(e.target?.result as ArrayBuffer) as any[];

        // Each row creates an independent invite, so they can run concurrently
        // instead of one round-trip at a time.
        const validRows = rows.filter(row => row.inviteName || row.name);
        await Promise.all(
          validRows.map((row, rowIndex) => {
            const inviteId = row.inviteId || generateInviteId();
            const name = row.inviteName || row.name;
            const guestNames = row.guests ? String(row.guests).split(',').map((s: string) => s.trim()) : [row.name];
            return createInviteWithGuests(
              inviteId,
              { name, import_order: rowIndex },
              guestNames,
              row.role || null
            );
          })
        );
        toast.success('Successfully imported invitations');
        setIsBulkOpen(false);
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

  const copyLink = useCallback((id: string) => {
    const url = `${window.location.origin}/?inviteUrl=${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard');
  }, []);

  const copyMessage = useCallback((invite: Invite) => {
    const message = messageTemplate
      .replace('<name>', invite.name)
      .replace('<link>', `${window.location.origin}/?inviteUrl=${invite.id}`);
    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard');
  }, [messageTemplate]);

  const handleEditClick = useCallback((invite: InviteWithCounts) => {
    setEditingInvite(invite);
    setIsEditOpen(true);
  }, []);

  const onUpdateName = useCallback(async (id: string, value: string) => {
    try {
      await updateDoc(doc(db, 'invites', id), { name: value });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invites/${id}`);
      toast.error('Failed to update invitation name');
    }
  }, []);

  const handleAddInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const inviteId = newInvite.id || generateInviteId();
      
      const maxOrder = invites.length > 0 
        ? Math.max(...invites.map(i => i.import_order || 0)) 
        : -1;

      // Check if ID already exists if manually provided
      if (newInvite.id) {
        const docRef = doc(db, 'invites', inviteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          toast.error('An invitation with this ID already exists');
          return;
        }
      }

      await setDoc(doc(db, 'invites', inviteId), {
        name: newInvite.name,
        import_order: maxOrder + 1,
        created_at: serverTimestamp()
      });

      toast.success('Invitation created successfully');
      setIsAddOpen(false);
      setNewInvite({ id: '', name: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'invites');
      toast.error('Failed to create invitation');
    }
  };

  const handleDeleteInvite = useCallback(async (id: string) => {
    try {
      await deleteInviteAndUnassignGuests(id);
      toast.success('Invitation deleted');
    } catch {
      toast.error('Failed to delete invitation');
    }
  }, []);

  const addGuestsToInvite = async () => {
    if (selectedGuestIds.length === 0 || !editingInvite) return;
    try {
      await commitInChunks(selectedGuestIds, (id, batch) => {
        batch.update(doc(db, 'guests', id), {
          invite_id: editingInvite.id,
          updated_at: serverTimestamp()
        });
      });
      await updateDoc(doc(db, 'invites', editingInvite.id), {
        guest_ids: arrayUnion(...selectedGuestIds)
      });
      toast.success(`${selectedGuestIds.length} guest(s) added to invite`);
      setSelectedGuestIds([]);
    } catch {
      toast.error('Failed to add guests');
    }
  };

  const removeGuestFromInvite = async (guest: Guest) => {
    try {
      await updateDoc(doc(db, 'guests', guest.id), {
        invite_id: null,
        updated_at: serverTimestamp()
      });
      if (guest.invite_id) {
        await updateDoc(doc(db, 'invites', guest.invite_id), {
          guest_ids: arrayRemove(guest.id)
        });
      }
      toast.success('Guest removed from invite');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${guest.id}`);
      toast.error('Failed to remove guest');
    }
  };

  const debouncedSearch = useDebounce(search, 300);

  const sortedInvites = useMemo((): InviteWithCounts[] => {
    const invitesWithCounts: InviteWithCounts[] = invites.map(invite => {
      const inviteGuestsList = guests.filter(g => g.invite_id === invite.id);
      return {
        ...invite,
        guest_count: inviteGuestsList.length,
        attending_count: inviteGuestsList.filter(g => g.is_coming === true).length
      };
    });

    const filteredInvites = invitesWithCounts.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           i.id.toLowerCase().includes(debouncedSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'completed') return i.attending_count === i.guest_count && i.guest_count > 0;
      if (statusFilter === 'partial') return i.attending_count > 0 && i.attending_count < i.guest_count;
      if (statusFilter === 'empty') return i.attending_count === 0;

      return true;
    });

    return [...filteredInvites].sort((a, b) => {
      const getSortValue = (val: any) => {
        if (val === null || val === undefined) return -Infinity;
        if (val?.seconds) return val.seconds;
        if (val instanceof Date) return val.getTime();
        return val;
      };

      const aValue = getSortValue(a[sortField as keyof typeof a]);
      const bValue = getSortValue(b[sortField as keyof typeof b]);

      let comparison = 0;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        comparison = aStr.localeCompare(bStr);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [invites, guests, debouncedSearch, statusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedInvites.length / itemsPerPage);
  const paginatedInvites = sortedInvites.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: keyof InviteWithCounts) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif mb-2">Invitations</h1>
          <p className="text-slate-500 text-sm">Manage invitation groups and distribute unique RSVP links.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger 
              render={
                <Button className="bg-wedding-gold hover:bg-wedding-gold/80">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Invite
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Invitation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input 
                    required 
                    placeholder="e.g. The Smith Family"
                    value={newInvite.name} 
                    onChange={e => setNewInvite(prev => ({ ...prev, name: e.target.value }))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invite ID (Optional - leave blank for auto)</Label>
                  <Input 
                    placeholder="e.g. smith-fam"
                    value={newInvite.id} 
                    onChange={e => setNewInvite(prev => ({ ...prev, id: e.target.value }))} 
                  />
                </div>
                <Button type="submit" className="w-full bg-wedding-gold">Create Invitation</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
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
                <DialogTitle>Import from Excel</DialogTitle>
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
                  <p className="text-xs text-slate-400 mt-2">Required columns: inviteName, guests (comma separated)</p>
                </div>
              </div>
              <div className="flex justify-center gap-2">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    const data = [
                      { inviteName: "The Smith Family", guests: "John Smith, Jane Smith, Alice Smith", inviteId: "smith-family" },
                      { inviteName: "Mr. Israel Valle", guests: "Israel Valle", inviteId: "israel-valle" }
                    ];
                    downloadExcel(
                      data,
                      [
                        { header: 'inviteName', key: 'inviteName', width: 25 },
                        { header: 'guests', key: 'guests', width: 40 },
                        { header: 'inviteId', key: 'inviteId', width: 20 },
                      ],
                      'Template',
                      'invites_template.xlsx'
                    );
                  }}
                  className="text-wedding-gold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    const data = invites.map(i => {
                      const inviteGuests = guests.filter(g => g.invite_id === i.id);
                      return {
                        inviteId: i.id,
                        inviteName: i.name,
                        guests: inviteGuests.map(g => g.name).join(', '),
                        guestCount: inviteGuests.length
                      };
                    });
                    downloadExcel(
                      data,
                      [
                        { header: 'inviteId', key: 'inviteId', width: 20 },
                        { header: 'inviteName', key: 'inviteName', width: 25 },
                        { header: 'guests', key: 'guests', width: 40 },
                        { header: 'guestCount', key: 'guestCount', width: 12 },
                      ],
                      'Invitations',
                      'wedding_invitations_backup.xlsx'
                    );
                  }}
                  className="text-slate-500"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
            <DialogTrigger 
              render={
                <Button variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Data
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-rose-600">Danger Zone: Clear All Data</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-slate-600 mb-4">
                  This action will <strong className="text-rose-600">permanently delete all Invitations and Guests</strong> from the database. This cannot be undone.
                </p>
                <p className="text-xs text-slate-400 italic">
                  Tip: You might want to export your data to Excel before clearing.
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setIsClearOpen(false)}
                  disabled={clearing}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" 
                  onClick={handleClearAllData}
                  disabled={clearing}
                >
                  {clearing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    'Yes, Clear All'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            className="pl-11 h-12 bg-white border-none shadow-sm rounded-2xl" 
            placeholder="Search by name or invite ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="h-12 px-4 rounded-2xl border-none shadow-sm bg-white text-sm focus:ring-2 focus:ring-wedding-gold"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="completed">Fully Joined</option>
            <option value="partial">Partially Joined</option>
            <option value="empty">No Response</option>
          </select>

          <select
            className="h-12 px-4 rounded-2xl border-none shadow-sm bg-white text-sm focus:ring-2 focus:ring-wedding-gold"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          {(search || statusFilter !== 'all') && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="h-12 px-4 rounded-2xl text-slate-500"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
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
                  Invite Group
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead 
                className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 cursor-pointer hover:text-wedding-gold transition-colors"
                onClick={() => handleSort('guest_count')}
              >
                <div className="flex items-center gap-2">
                  Guests
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead 
                className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 cursor-pointer hover:text-wedding-gold transition-colors"
                onClick={() => handleSort('attending_count')}
              >
                <div className="flex items-center gap-2">
                  Status
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead 
                className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 cursor-pointer hover:text-wedding-gold transition-colors"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-2">
                  ID / Link
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-wedding-gold opacity-20" />
                </TableCell>
              </TableRow>
            ) : paginatedInvites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center text-slate-400">
                  No invitations found.
                </TableCell>
              </TableRow>
            ) : paginatedInvites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                onCopyLink={copyLink}
                onCopyMessage={copyMessage}
                onUpdateName={onUpdateName}
                onEdit={handleEditClick}
                onDelete={handleDeleteInvite}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedInvites.length)}</span> of <span className="font-medium">{sortedInvites.length}</span> invitations
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
        <SheetContent className="data-[side=right]:sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Invite: {editingInvite?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 overflow-y-auto flex-1 px-4 pb-4">
            <div className="space-y-4">
              <Label className="text-lg font-serif">Assigned Guests</Label>
              <div className="space-y-2">
                {inviteGuests.map((guest, index) => (
                  <div key={guest.id} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-[10px] font-mono text-slate-400 w-4 flex-shrink-0">{index + 1}</span>
                      <span className="font-medium text-slate-700 truncate">{guest.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeGuestFromInvite(guest)}
                      className="text-slate-400 hover:text-rose-500 h-8 w-8 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {inviteGuests.length === 0 && (
                  <p className="text-sm text-slate-400 italic py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    No guests assigned yet.
                  </p>
                )}
              </div>

              <div className="pt-4 space-y-3">
                <Label className="text-sm font-medium">Add from existing pool</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Popover open={guestPopoverOpen} onOpenChange={setGuestPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={guestPopoverOpen}
                        className="flex-1 justify-between font-normal h-11 px-4 bg-white border-slate-200 hover:border-wedding-gold/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {selectedGuestIds.length > 0 ? (
                            <span className="bg-wedding-gold/10 text-wedding-gold px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                              {selectedGuestIds.length} Selected
                            </span>
                          ) : (
                            <span className="text-slate-400">Select guests...</span>
                          )}
                          <span className="text-slate-500 truncate text-xs">
                            {selectedGuestIds.length > 0 && 
                              unassignedGuests.filter(g => selectedGuestIds.includes(g.id)).map(g => g.name).join(', ')
                            }
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command className="border-none">
                        <CommandInput placeholder="Search pool..." className="h-10" />
                        <CommandList className="max-h-64">
                          <CommandEmpty>No guests found in pool.</CommandEmpty>
                          <CommandGroup>
                            {unassignedGuests.map((g) => (
                              <CommandItem
                                key={g.id}
                                value={g.name}
                                onSelect={() => {
                                  setSelectedGuestIds(prev => 
                                    prev.includes(g.id) 
                                      ? prev.filter(id => id !== g.id) 
                                      : [...prev, g.id]
                                  );
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedGuestIds.includes(g.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {g.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                        {selectedGuestIds.length > 0 && (
                          <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{selectedGuestIds.length} Selected</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2"
                              onClick={() => setSelectedGuestIds([])}
                            >
                              Clear
                            </Button>
                          </div>
                        )}
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button 
                    type="button" 
                    onClick={addGuestsToInvite}
                    disabled={selectedGuestIds.length === 0}
                    className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm sm:min-w-[120px]"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add {selectedGuestIds.length > 0 ? `(${selectedGuestIds.length})` : ''}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
