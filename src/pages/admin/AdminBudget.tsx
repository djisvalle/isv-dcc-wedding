import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit2,
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  PhilippinePeso,
  LayoutGrid
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc
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
import { format } from 'date-fns';

interface Supplier {
  id: string;
  name: string;
  type: string;
  budget: number;
  created_at: any;
}

interface Payment {
  id: string;
  supplier_id: string;
  amount: number;
  date: string;
  remarks: string;
  status: 'paid' | 'scheduled';
  created_at: any;
}

export default function AdminBudget() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState({ name: '', type: '', budget: '' });
  const [paymentForm, setPaymentForm] = useState<{
    supplier_id: string;
    amount: string;
    date: string;
    remarks: string;
    status: 'paid' | 'scheduled';
  }>({ 
    supplier_id: '', 
    amount: '', 
    date: format(new Date(), 'yyyy-MM-dd'), 
    remarks: '', 
    status: 'paid' 
  });
  const [budgetForm, setBudgetForm] = useState('');

  useEffect(() => {
    // Fetch Settings (Total Budget)
    const fetchBudget = async () => {
      const budgetDoc = await getDoc(doc(db, 'settings', 'total_budget'));
      if (budgetDoc.exists()) {
        const value = Number(budgetDoc.data().value);
        setTotalBudget(value);
        setBudgetForm(value.toString());
      }
    };
    fetchBudget();

    // Listen to Suppliers
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'suppliers');
    });

    // Listen to Payments
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'payments');
    });

    return () => {
      unsubSuppliers();
      unsubPayments();
    };
  }, []);

  const handleSaveBudget = async () => {
    try {
      await setDoc(doc(db, 'settings', 'total_budget'), {
        key: 'total_budget',
        value: budgetForm,
        updated_at: serverTimestamp()
      });
      setTotalBudget(Number(budgetForm));
      toast.success('Total budget updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/total_budget');
      toast.error('Failed to update budget');
    }
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name || !supplierForm.type) return;
    
    try {
      const data = {
        name: supplierForm.name,
        type: supplierForm.type,
        budget: Number(supplierForm.budget) || 0,
        updated_at: serverTimestamp()
      };

      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), data);
        toast.success('Supplier updated');
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...data,
          created_at: serverTimestamp()
        });
        toast.success('Supplier added');
      }
      setIsSupplierModalOpen(false);
      setSupplierForm({ name: '', type: '', budget: '' });
      setEditingSupplier(null);
    } catch (error) {
      handleFirestoreError(error, editingSupplier ? OperationType.UPDATE : OperationType.CREATE, 'suppliers');
      toast.error('Operation failed');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Are you sure? This will not delete historical payments but will orphan them.')) return;
    try {
      await deleteDoc(doc(db, 'suppliers', id));
      toast.success('Supplier deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `suppliers/${id}`);
      toast.error('Delete failed');
    }
  };

  const handleSavePayment = async () => {
    if (!paymentForm.supplier_id || !paymentForm.amount || !paymentForm.date) return;
    
    try {
      const data = {
        supplier_id: paymentForm.supplier_id,
        amount: Number(paymentForm.amount),
        date: paymentForm.date,
        remarks: paymentForm.remarks,
        status: paymentForm.status,
        updated_at: serverTimestamp()
      };

      if (editingPayment) {
        await updateDoc(doc(db, 'payments', editingPayment.id), data);
        toast.success('Payment updated');
      } else {
        await addDoc(collection(db, 'payments'), {
          ...data,
          created_at: serverTimestamp()
        });
        toast.success('Payment added');
      }
      setIsPaymentModalOpen(false);
      setPaymentForm({ supplier_id: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), remarks: '', status: 'paid' });
      setEditingPayment(null);
    } catch (error) {
      handleFirestoreError(error, editingPayment ? OperationType.UPDATE : OperationType.CREATE, 'payments');
      toast.error('Operation failed');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'payments', id));
      toast.success('Payment deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `payments/${id}`);
      toast.error('Delete failed');
    }
  };

  const totalSpent = payments.reduce((acc, p) => acc + (p.status === 'paid' ? p.amount : 0), 0);
  const totalAllocated = suppliers.reduce((acc, s) => acc + (s.budget || 0), 0);
  const remainingBudget = totalBudget - totalSpent;

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.type.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-4xl font-serif mb-2">Budget & Payments</h1>
          <p className="text-slate-500">Manage wedding expenses and supplier transactions.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="rounded-xl bg-wedding-gold hover:bg-wedding-gold/90 text-white px-6"
            onClick={() => {
              setEditingSupplier(null);
              setSupplierForm({ name: '', type: '', budget: '' });
              setIsSupplierModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
          <Button 
            className="rounded-xl bg-wedding-dark hover:bg-wedding-dark/90 text-white px-6"
            onClick={() => {
              setEditingPayment(null);
              setPaymentForm({ supplier_id: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), remarks: '', status: 'paid' });
              setIsPaymentModalOpen(true);
            }}
          >
            <PhilippinePeso className="w-4 h-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Budget</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Input 
                type="number" 
                value={budgetForm}
                onChange={(e) => setBudgetForm(e.target.value)}
                className="h-10 text-xl font-bold bg-slate-50 border-none focus:ring-2 focus:ring-blue-200"
              />
              <Button size="sm" variant="ghost" onClick={handleSaveBudget} className="text-blue-500 font-bold px-4">Update</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Spent</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">₱{totalSpent.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
              <LayoutGrid className="w-6 h-6 text-purple-500" />
            </div>
            <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Allocated (Suppliers)</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">₱{totalAllocated.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className={`w-12 h-12 ${remainingBudget < 0 ? 'bg-rose-50' : 'bg-amber-50'} rounded-2xl flex items-center justify-center mb-4`}>
              <AlertCircle className={`w-6 h-6 ${remainingBudget < 0 ? 'text-rose-500' : 'text-amber-500'}`} />
            </div>
            <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Remaining</div>
            <div className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-rose-500' : 'text-slate-800'} mt-1`}>
              ₱{remainingBudget.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Suppliers Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif">Suppliers</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search suppliers..." 
                className="pl-10 h-10 w-48 rounded-xl border-none shadow-sm bg-white text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {filteredSuppliers.map(supplier => {
              const supplierPayments = payments.filter(p => p.supplier_id === supplier.id);
              const spent = supplierPayments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
              const balance = (supplier.budget || 0) - spent;
              
              return (
                <Card key={supplier.id} className="border-none shadow-sm hover:shadow-md transition-all group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-800 text-lg">{supplier.name}</h3>
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 bg-slate-100 rounded-full">{supplier.type}</span>
                        </div>
                        <p className="text-sm text-slate-400">Allocated Budget: ₱{supplier.budget?.toLocaleString() || 0}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
                          onClick={() => {
                            setEditingSupplier(supplier);
                            setSupplierForm({ name: supplier.name, type: supplier.type, budget: supplier.budget?.toString() || '' });
                            setIsSupplierModalOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${spent > (supplier.budget || 0) ? 'bg-rose-500' : 'bg-wedding-gold'}`}
                          style={{ width: `${Math.min((spent / (supplier.budget || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400 uppercase tracking-widest">Spent: ₱{spent.toLocaleString()}</span>
                        <span className={`${balance < 0 ? 'text-rose-500' : 'text-slate-400'} uppercase tracking-widest`}>
                          {balance < 0 ? `Over: ₱${Math.abs(balance).toLocaleString()}` : `Balance: ₱${balance.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payments Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif">Transactions</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => {
              const supplier = suppliers.find(s => s.id === payment.supplier_id);
              const isPaid = payment.status === 'paid';

              return (
                <div 
                  key={payment.id} 
                  className="bg-white p-4 rounded-2xl shadow-sm border-l-4 group flex items-center justify-between"
                  style={{ borderLeftColor: isPaid ? '#10b981' : '#f59e0b' }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPaid ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                      {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800">{supplier?.name || 'Unknown Supplier'}</p>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-0.5">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(payment.date), 'MMM dd, yyyy')}
                        </div>
                        {payment.remarks && (
                          <p className="text-xs text-slate-400 italic truncate max-w-xs">{payment.remarks}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`font-bold ${isPaid ? 'text-slate-800' : 'text-slate-400'}`}>₱{payment.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-wedding-gold"
                        onClick={() => {
                          setEditingPayment(payment);
                          setPaymentForm({
                            supplier_id: payment.supplier_id,
                            amount: payment.amount.toString(),
                            date: payment.date,
                            remarks: payment.remarks || '',
                            status: payment.status
                          });
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-rose-500"
                        onClick={() => handleDeletePayment(payment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Supplier Modal */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input 
                value={supplierForm.name} 
                onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="e.g. Purre Real Gardens"
                className="rounded-xl border-slate-100 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Type of Supplier</Label>
              <Input 
                value={supplierForm.type} 
                onChange={e => setSupplierForm({ ...supplierForm, type: e.target.value })}
                placeholder="e.g. Venue, Catering, Photo"
                className="rounded-xl border-slate-100 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Allocated Budget (₱)</Label>
              <Input 
                type="number"
                value={supplierForm.budget} 
                onChange={e => setSupplierForm({ ...supplierForm, budget: e.target.value })}
                placeholder="0.00"
                className="rounded-xl border-slate-100 h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSupplierModalOpen(false)}>Cancel</Button>
            <Button className="bg-wedding-gold text-white rounded-xl px-8" onClick={handleSaveSupplier}>
              {editingSupplier ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{editingPayment ? 'Edit Payment' : 'New Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <select 
                className="w-full h-12 rounded-xl border border-slate-100 px-4 text-sm"
                value={paymentForm.supplier_id}
                onChange={e => setPaymentForm({ ...paymentForm, supplier_id: e.target.value })}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₱)</Label>
              <Input 
                type="number"
                value={paymentForm.amount} 
                onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0.00"
                className="rounded-xl border-slate-100 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date"
                value={paymentForm.date} 
                onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                className="rounded-xl border-slate-100 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="radio" 
                    name="status" 
                    checked={paymentForm.status === 'paid'} 
                    onChange={() => setPaymentForm({ ...paymentForm, status: 'paid' })}
                  />
                  Already Paid
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="radio" 
                    name="status" 
                    checked={paymentForm.status === 'scheduled'} 
                    onChange={() => setPaymentForm({ ...paymentForm, status: 'scheduled' })}
                  />
                  Future Payment
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input 
                value={paymentForm.remarks} 
                onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                placeholder="Reference #, Downpayment, etc."
                className="rounded-xl border-slate-100 h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button className="bg-wedding-dark text-white rounded-xl px-8" onClick={handleSavePayment}>
              {editingPayment ? 'Save Changes' : 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
