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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, Search, Loader2, UserCheck, UserX, UserMinus, Plus, Trash2, Edit2, Upload, FileSpreadsheet } from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';

interface Guest {
  id: string;
  invite_id: string | null;
  name: string;
  is_coming: boolean | null;
  role: string | null;
  updated_at: any;
  invite_name?: string | null;
}

interface Invite {
  id: string;
  name: string;
}

const GUEST_ROLES = [
  'Father of the Bride',
  'Mother of the Bride',
  'Mother of the Groom',
  'Principal Sponsor',
  'Secondary Sponsor',
  'Groomsman',
  'Bridesmaid',
  'Best Man',
  'Maid of Honor'
];

export default function AdminGuests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // New guest state
  const [newGuest, setNewGuest] = useState({ name: '', role: '', invite_id: '' });

  useEffect(() => {
    const unsubInvites = onSnapshot(collection(db, 'invites'), (snap) => {
      setInvites(snap.docs.map(d => ({ id: d.id, name: d.data().name } as Invite)));
    });

    const unsubGuests = onSnapshot(collection(db, 'guests'), (snap) => {
      setGuests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Guest)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'guests');
    });

    return () => {
      unsubInvites();
      unsubGuests();
    };
  }, []);

  const handleExport = () => {
    try {
      const data = guests.map(g => ({
        Name: g.name,
        Role: g.role || 'Standard',
        Group: invites.find(i => i.id === g.invite_id)?.name || 'Unassigned',
        Response: g.is_coming === true ? 'Attending' : g.is_coming === false ? 'Declined' : 'Pending',
        LastUpdated: g.updated_at ? new Date(g.updated_at?.seconds * 1000).toLocaleString() : 'N/A'
      }));

      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Guests');
      xlsx.writeFile(workbook, 'wedding_guest_list.xlsx');
      toast.success('Guest list exported successfully');
    } catch (err) {
      toast.error('Failed to export guest list');
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'guests'), {
        name: newGuest.name,
        role: newGuest.role || null,
        invite_id: newGuest.invite_id || null,
        is_coming: null,
        updated_at: serverTimestamp()
      });
      toast.success('Guest added successfully');
      setNewGuest({ name: '', role: '', invite_id: '' });
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
        name: editingGuest.name,
        role: editingGuest.role || null,
        invite_id: editingGuest.invite_id || null
      });
      toast.success('Guest updated successfully');
      setIsEditOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${editingGuest.id}`);
      toast.error('Failed to update guest');
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guest?')) return;
    try {
      await deleteDoc(doc(db, 'guests', id));
      toast.success('Guest deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `guests/${id}`);
      toast.error('Failed to delete guest');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} guests?`)) return;
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, 'guests', id));
      }
      toast.success('Guests deleted successfully');
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete guests');
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

        for (const row of rows) {
          if (row.name) {
            await addDoc(collection(db, 'guests'), {
              name: row.name,
              role: row.role || null,
              invite_id: row.inviteId || null,
              is_coming: null,
              updated_at: serverTimestamp()
            });
          }
        }
        toast.success('Successfully imported guest list');
        setIsUploadOpen(false);
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

  const guestsWithInviteName = guests.map(g => ({
    ...g,
    invite_name: invites.find(i => i.id === g.invite_id)?.name
  }));

  const filteredGuests = guestsWithInviteName.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    (g.invite_name && g.invite_name.toLowerCase().includes(search.toLowerCase())) ||
    (g.role && g.role.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredGuests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGuests.map(g => g.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif mb-2">Guest List</h1>
          <p className="text-slate-500 text-sm">Detailed overview of all individual RSVP responses.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <Button onClick={handleBulkDelete} variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.length})
            </Button>
          )}
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-wedding-gold hover:bg-wedding-gold/80">
                <Plus className="w-4 h-4 mr-2" />
                Add Guest
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Guest</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddGuest} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    required 
                    value={newGuest.name} 
                    onChange={e => setNewGuest(prev => ({ ...prev, name: e.target.value }))} 
                  />
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
                <div className="space-y-2">
                  <Label>Invitation Group (Optional)</Label>
                  <select 
                    className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={newGuest.invite_id} 
                    onChange={e => setNewGuest(prev => ({ ...prev, invite_id: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {invites.map(invite => (
                      <option key={invite.id} value={invite.id}>{invite.name}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full bg-wedding-gold">Create Guest</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-200">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
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

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input 
          className="pl-11 h-12 bg-white border-none shadow-sm rounded-2xl" 
          placeholder="Search by name, role, or group..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-12 px-8">
                <Checkbox 
                  checked={selectedIds.length === filteredGuests.length && filteredGuests.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400">Guest Name</TableHead>
              <TableHead className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400">Role</TableHead>
              <TableHead className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400">Group</TableHead>
              <TableHead className="py-6 px-8 tracking-wider uppercase text-[10px] font-bold text-slate-400">Response</TableHead>
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
            ) : filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center text-slate-400">
                  No guests found.
                </TableCell>
              </TableRow>
            ) : filteredGuests.map((guest) => (
              <TableRow key={guest.id} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell className="px-8">
                  <Checkbox 
                    checked={selectedIds.includes(guest.id)}
                    onCheckedChange={() => toggleSelect(guest.id)}
                  />
                </TableCell>
                <TableCell className="py-6 px-8">
                  <div className="font-semibold text-slate-700">{guest.name}</div>
                  {guest.updated_at && (
                    <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                      Updated {guest.updated_at.seconds ? new Date(guest.updated_at.seconds * 1000).toLocaleDateString() : new Date(guest.updated_at).toLocaleDateString()}
                    </div>
                  )}
                </TableCell>
                <TableCell className="py-6 px-8">
                  {guest.role ? (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                      {guest.role}
                    </span>
                  ) : (
                    <span className="text-slate-300 italic text-xs">Standard</span>
                  )}
                </TableCell>
                <TableCell className="py-6 px-8 text-slate-500 italic font-serif">
                  {guest.invite_name || <span className="text-slate-300 opacity-50">Unassigned</span>}
                </TableCell>
                <TableCell className="py-6 px-8">
                  <div className="flex items-center gap-2">
                    {guest.is_coming === true ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                        <UserCheck className="w-4 h-4" /> Attending
                      </div>
                    ) : guest.is_coming === false ? (
                      <div className="flex items-center gap-1.5 text-rose-500 font-semibold text-sm">
                        <UserX className="w-4 h-4" /> Declined
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium text-sm italic">
                        <UserMinus className="w-4 h-4" /> Pending
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-6 px-8 text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingGuest(guest);
                        setIsEditOpen(true);
                      }}
                      className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteGuest(guest.id)}
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditGuest} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                required 
                value={editingGuest?.name || ''} 
                onChange={e => setEditingGuest(prev => prev ? ({ ...prev, name: e.target.value }) : null)} 
              />
            </div>
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
            <div className="space-y-2">
              <Label>Invitation Group</Label>
              <select 
                className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={editingGuest?.invite_id || ''} 
                onChange={e => setEditingGuest(prev => prev ? ({ ...prev, invite_id: e.target.value }) : null)}
              >
                <option value="">Unassigned</option>
                {invites.map(invite => (
                  <option key={invite.id} value={invite.id}>{invite.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full bg-wedding-gold">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
