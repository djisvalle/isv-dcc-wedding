import React, { useEffect, useState, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, Upload, Download, FileSpreadsheet, Loader2, Search, Plus, Edit2, Trash2, UserPlus, X, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { generateInviteId } from '@/lib/utils';
import * as xlsx from 'xlsx';
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

interface Invite {
  id: string;
  name: string;
  import_order?: number;
  created_at?: any;
  guest_count?: number;
  attending_count?: number;
}

interface Guest {
  id: string;
  name: string;
  invite_id: string | null;
  import_order?: number;
}

export default function AdminInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<keyof Invite | 'guest_count' | 'attending_count'>('import_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [newInvite, setNewInvite] = useState({ id: '', name: '' });
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null);
  const [inviteGuests, setInviteGuests] = useState<Guest[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);

  useEffect(() => {
    const unsubInvites = onSnapshot(collection(db, 'invites'), (snap) => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'invites'));

    const unsubGuests = onSnapshot(collection(db, 'guests'), (snap) => {
      const allGuests = snap.docs.map(d => ({ id: d.id, ...d.data() } as Guest));
      setGuests(allGuests);
      setUnassignedGuests(allGuests.filter(g => !g.invite_id));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'guests'));

    return () => {
      unsubInvites();
      unsubGuests();
    };
  }, []);

  useEffect(() => {
    if (editingInvite) {
      setInviteGuests(guests.filter(g => g.invite_id === editingInvite.id));
    }
  }, [guests, editingInvite]);

  const handleClearAllData = async () => {
    setClearing(true);
    try {
      // Delete all guests
      const guestSnap = await getDocs(collection(db, 'guests'));
      const deleteGuestPromises = guestSnap.docs.map(d => deleteDoc(doc(db, 'guests', d.id)));
      
      // Delete all invites
      const inviteSnap = await getDocs(collection(db, 'invites'));
      const deleteInvitePromises = inviteSnap.docs.map(d => deleteDoc(doc(db, 'invites', d.id)));
      
      await Promise.all([...deleteGuestPromises, ...deleteInvitePromises]);
      
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
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = xlsx.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet) as any[];

        let rowIndex = 0;
        for (const row of rows) {
          const inviteId = row.inviteId || generateInviteId();
          const name = row.inviteName || row.name;
          if (!name) continue;

          await setDoc(doc(db, 'invites', inviteId), {
            name,
            import_order: rowIndex++,
            created_at: serverTimestamp()
          }, { merge: true });

          const guestNames = row.guests ? String(row.guests).split(',').map((s: string) => s.trim()) : [row.name];
          let guestIndex = 0;
          for (const guestName of guestNames) {
            if (guestName) {
              await addDoc(collection(db, 'guests'), {
                name: guestName,
                invite_id: inviteId,
                role: row.role || null,
                is_coming: null,
                import_order: guestIndex++,
                updated_at: serverTimestamp()
              });
            }
          }
        }
        toast.success('Successfully imported invitations');
        setIsBulkOpen(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
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

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/?inviteUrl=${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard');
  };

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

  const handleEditInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvite) return;
    try {
      await updateDoc(doc(db, 'invites', editingInvite.id), {
        name: editingInvite.name
      });
      toast.success('Invitation updated successfully');
      setIsEditOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invites/${editingInvite.id}`);
      toast.error('Failed to update invitation');
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invitation? All associated guests will be unassigned.')) return;
    try {
      // Unassign guests
      const inviteGuestsRef = query(collection(db, 'guests'), where('invite_id', '==', id));
      const snap = await getDocs(inviteGuestsRef);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'guests', d.id), { invite_id: null });
      }
      // Delete invite
      await deleteDoc(doc(db, 'invites', id));
      toast.success('Invitation deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `invites/${id}`);
      toast.error('Failed to delete invitation');
    }
  };

  const addGuestToInvite = async () => {
    if (!selectedGuestId || !editingInvite) return;
    try {
      await updateDoc(doc(db, 'guests', selectedGuestId), {
        invite_id: editingInvite.id
      });
      toast.success('Guest added to invite');
      setSelectedGuestId('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${selectedGuestId}`);
      toast.error('Failed to add guest');
    }
  };

  const removeGuestFromInvite = async (guest: Guest) => {
    try {
      await updateDoc(doc(db, 'guests', guest.id), {
        invite_id: null
      });
      toast.success('Guest removed from invite');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${guest.id}`);
      toast.error('Failed to remove guest');
    }
  };

  const invitesWithCounts = invites.map(invite => {
    const inviteGuestsList = guests.filter(g => g.invite_id === invite.id);
    return {
      ...invite,
      guest_count: inviteGuestsList.length,
      attending_count: inviteGuestsList.filter(g => (g as any).is_coming === true).length
    };
  });

  const filteredInvites = invitesWithCounts.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.id.toLowerCase().includes(search.toLowerCase())
  );

  const sortedInvites = [...filteredInvites].sort((a, b) => {
    const getSortValue = (val: any) => {
      if (val === null || val === undefined) return -Infinity;
      if (val?.seconds) return val.seconds;
      if (val instanceof Date) return val.getTime();
      return val;
    };

    let aValue = getSortValue(a[sortField as keyof typeof a]);
    let bValue = getSortValue(b[sortField as keyof typeof b]);

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const totalPages = Math.ceil(sortedInvites.length / itemsPerPage);
  const paginatedInvites = sortedInvites.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: keyof Invite | 'guest_count' | 'attending_count') => {
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
                    const worksheet = xlsx.utils.json_to_sheet(data);
                    const workbook = xlsx.utils.book_new();
                    xlsx.utils.book_append_sheet(workbook, worksheet, 'Template');
                    xlsx.writeFile(workbook, 'invites_template.xlsx');
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
                    const worksheet = xlsx.utils.json_to_sheet(data);
                    const workbook = xlsx.utils.book_new();
                    xlsx.utils.book_append_sheet(workbook, worksheet, 'Invitations');
                    xlsx.writeFile(workbook, 'wedding_invitations_backup.xlsx');
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
        <div>
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
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
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
              <TableRow key={invite.id} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell className="py-6 px-8 font-semibold text-slate-700">{invite.name}</TableCell>
                <TableCell className="py-6 px-8 text-slate-500">{invite.guest_count} Guests</TableCell>
                <TableCell className="py-6 px-8">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    invite.attending_count === invite.guest_count 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : invite.attending_count > 0 
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {invite.attending_count} / {invite.guest_count} Joined
                  </span>
                </TableCell>
                <TableCell className="py-6 px-8">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => copyLink(invite.id)}
                    title="Click to copy full link"
                  >
                    <code className="text-[10px] font-mono text-wedding-gold bg-wedding-gold/5 px-2 py-1 rounded truncate max-w-[150px]">
                      ?inviteUrl={invite.id}
                    </code>
                    <Copy className="w-3 h-3 text-wedding-gold opacity-40" />
                  </div>
                </TableCell>
                <TableCell className="py-6 px-8 text-right">
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingInvite(invite);
                        setIsEditOpen(true);
                      }}
                      className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => copyLink(invite.id)}
                      className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteInvite(invite.id)}
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Invite: {editingInvite?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <form onSubmit={handleEditInvite} className="space-y-4 pb-6 border-b border-slate-100">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input 
                  value={editingInvite?.name || ''} 
                  onChange={e => setEditingInvite(prev => prev ? ({ ...prev, name: e.target.value }) : null)} 
                />
              </div>
              <Button type="submit" className="w-full bg-wedding-gold">Update Settings</Button>
            </form>

            <div className="space-y-4">
              <Label className="text-lg font-serif">Assigned Guests</Label>
              <div className="space-y-2">
                {inviteGuests.map(guest => (
                  <div key={guest.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-medium text-slate-700">{guest.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeGuestFromInvite(guest)}
                      className="text-slate-400 hover:text-rose-500 h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {inviteGuests.length === 0 && (
                  <p className="text-sm text-slate-400 italic py-4 text-center">No guests assigned yet.</p>
                )}
              </div>

              <div className="pt-4 space-y-2 flex flex-col">
                <Label>Add from existing pool</Label>
                <div className="flex gap-2">
                  <Popover open={guestPopoverOpen} onOpenChange={setGuestPopoverOpen}>
                    <PopoverTrigger 
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={guestPopoverOpen}
                          className="flex-1 justify-between font-normal h-10 px-3 bg-white border-slate-200"
                        >
                          {selectedGuestId
                            ? unassignedGuests.find((g) => g.id === selectedGuestId)?.name
                            : "Select a guest..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      }
                    />
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search guest..." />
                        <CommandList>
                          <CommandEmpty>No guest found.</CommandEmpty>
                          <CommandGroup>
                            {unassignedGuests.map((g) => (
                              <CommandItem
                                key={g.id}
                                value={g.name}
                                onSelect={() => {
                                  setSelectedGuestId(g.id);
                                  setGuestPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedGuestId === g.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {g.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button 
                    type="button" 
                    onClick={addGuestToInvite}
                    disabled={!selectedGuestId}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
