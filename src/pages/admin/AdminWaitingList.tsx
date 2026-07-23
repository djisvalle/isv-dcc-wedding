import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  Edit2, 
  Hourglass,
  ArrowRight,
  UserPlus,
  MoreVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface WaitingGuest {
  id: string;
  name: string;
  role: string;
  notes: string;
  priority: number;
  created_at: any;
}

export default function AdminWaitingList() {
  const [waitingList, setWaitingList] = useState<WaitingGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<WaitingGuest | null>(null);

  // Form state
  const [form, setForm] = useState({ name: '', role: '', notes: '', priority: '1' });

  const [guests, setGuests] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'waiting_list'), (snap) => {
      setWaitingList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WaitingGuest)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'waiting_list');
    });

    const unsubGuests = onSnapshot(collection(db, 'guests'), (snap) => {
      setGuests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub();
      unsubGuests();
    };
  }, []);

  const handleSave = async () => {
    if (!form.name) return;
    
    try {
      const data = {
        name: form.name,
        role: form.role,
        notes: form.notes,
        priority: Number(form.priority) || 1,
        updated_at: serverTimestamp()
      };

      if (editingGuest) {
        await updateDoc(doc(db, 'waiting_list', editingGuest.id), data);
        toast.success('Guest updated');
      } else {
        await addDoc(collection(db, 'waiting_list'), {
          ...data,
          created_at: serverTimestamp()
        });
        toast.success('Guest added to waiting list');
      }
      setIsModalOpen(false);
      setForm({ name: '', role: '', notes: '', priority: '1' });
      setEditingGuest(null);
    } catch (error) {
      handleFirestoreError(error, editingGuest ? OperationType.UPDATE : OperationType.CREATE, 'waiting_list');
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this person from the waiting list? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'waiting_list', id));
      toast.success('Guest removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `waiting_list/${id}`);
      toast.error('Delete failed');
    }
  };

  const handlePromote = async (guest: WaitingGuest) => {
    try {
      const maxOrder = guests.length > 0 
        ? Math.max(...guests.map(g => g.import_order || 0)) 
        : -1;
      
      const batch = writeBatch(db);
      
      // 1. Create a new Guest directly, no invite created
      const guestRef = doc(collection(db, 'guests'));
      batch.set(guestRef, {
        invite_id: null, // Initially unassigned to a group
        name: guest.name,
        role: guest.role || 'Guest',
        is_coming: null,
        import_order: maxOrder + 1,
        updated_at: serverTimestamp()
      });
      
      // 3. Delete from Waiting List
      const waitingRef = doc(db, 'waiting_list', guest.id);
      batch.delete(waitingRef);
      
      await batch.commit();
      toast.success(`${guest.name} promoted to main Guest List!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'promotion_action');
      toast.error('Promotion failed');
    }
  };

  const sortedList = [...waitingList].sort((a, b) => {
    // Primary: Priority (1 is highest, so ascending)
    const pA = a.priority || 3;
    const pB = b.priority || 3;
    if (pA !== pB) return pA - pB;
    
    // Secondary: Time added (Earliest first for fairness)
    const tA = a.created_at?.seconds || 0;
    const tB = b.created_at?.seconds || 0;
    return tA - tB;
  });
  const filteredList = sortedList.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif mb-2">Waiting List</h1>
          <p className="text-slate-500">Manage standby guests for available spots.</p>
        </div>
        <Button 
          className="rounded-xl bg-wedding-gold hover:bg-wedding-gold/90 text-white px-6"
          onClick={() => {
            setEditingGuest(null);
            setForm({ name: '', role: '', notes: '', priority: '1' });
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Standby Guest
        </Button>
      </div>

      <div className="flex items-center gap-4 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search standby list..." 
            className="pl-10 h-12 rounded-xl border-none shadow-sm bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredList.map((guest, index) => (
          <Card key={guest.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-wedding-gold/10 rounded-2xl flex items-center justify-center">
                    <Hourglass className="w-6 h-6 text-wedding-gold" />
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                      onClick={() => handlePromote(guest)}
                      title="Promote to Main List"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-wedding-gold"
                      onClick={() => {
                        setEditingGuest(guest);
                        setForm({ 
                          name: guest.name, 
                          role: guest.role || '', 
                          notes: guest.notes || '', 
                          priority: (guest.priority || 1).toString() 
                        });
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-rose-500"
                      onClick={() => handleDelete(guest.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-800">{guest.name}</h3>
                  <p className="text-sm font-medium text-wedding-gold uppercase tracking-widest">{guest.role || 'No Role'}</p>
                </div>

                {guest.notes && (
                  <p className="mt-4 text-sm text-slate-500 italic bg-wedding-cream/30 p-3 rounded-xl">
                    "{guest.notes}"
                  </p>
                )}
              </div>

              <div className="px-6 py-3 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Priority Level</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map(p => (
                      <div key={p} className={`w-2 h-2 rounded-full ${p <= (4 - (guest.priority || 3)) ? 'bg-wedding-gold' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">#{(index + 1).toString().padStart(2, '0')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredList.length === 0 && !loading && (
        <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-100">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Hourglass className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-2xl font-serif text-slate-400">No guests in standby</h3>
          <p className="text-slate-400 mt-2">Everyone is either in or out. Good job!</p>
        </div>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingGuest ? 'Edit Standby Guest' : 'New Standby Guest'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Juan Dela Cruz"
                className="rounded-2xl border-slate-100 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Potential Role</Label>
              <Input 
                value={form.role} 
                onChange={e => setForm({ ...form, role: e.target.value })}
                placeholder="e.g. Bridesmaid, Guest"
                className="rounded-2xl border-slate-100 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority Level (1-3)</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map(val => (
                  <Button
                    key={val}
                    variant={Number(form.priority) === val ? 'default' : 'outline'}
                    className={`flex-1 rounded-xl h-10 ${Number(form.priority) === val ? 'bg-wedding-gold text-white' : ''}`}
                    onClick={() => setForm({ ...form, priority: val.toString() })}
                  >
                    Level {val}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input 
                value={form.notes} 
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Cousin of the bride, wait for RSVP list"
                className="rounded-2xl border-slate-100 h-12"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="bg-wedding-gold text-white rounded-xl px-12 h-12" onClick={handleSave}>
              {editingGuest ? 'Save Changes' : 'Add to Standby'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
