import { useEffect, useState } from 'react';
import {
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { collection, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Loader2, Users, Wallet, Ticket, LayoutGrid } from 'lucide-react';

interface Stats {
  attending: number;
  declined: number;
  pending: number;
  totalGuests: number;
  totalBudget: number;
  totalSpent: number;
  totalAllocated: number;
}

interface Guest {
  id: string;
  is_coming?: boolean | null;
  is_baby_or_child?: boolean;
  role?: string;
  table_number?: string;
}

export default function AdminReports() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [roleData, setRoleData] = useState<any[]>([]);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Total Budget from settings
      const budgetDoc = await getDoc(doc(db, 'settings', 'total_budget'));
      const totalBudgetAccount = Number(budgetDoc.data()?.value || 0);

      // Listen to data
      const unsubGuests = onSnapshot(collection(db, 'guests'), (snap) => {
        const guests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Guest[];
        const totalGuests = guests.filter(g => !g.is_baby_or_child).length;
        const attending = guests.filter(g => g.is_coming === true && !g.is_baby_or_child).length;
        const declined = guests.filter(g => g.is_coming === false && !g.is_baby_or_child).length;
        const pending = guests.filter(g => g.is_coming === null && !g.is_baby_or_child).length;

        // Role Breakdown
        const roles: Record<string, number> = {};
        guests.filter(g => !g.is_baby_or_child).forEach(g => {
          const role = g.role || 'Guest';
          roles[role] = (roles[role] || 0) + 1;
        });
        setRoleData(Object.entries(roles).map(([name, value]) => ({ name, value })));

        // Table Utilization (assuming table_number exists)
        const tables: Record<string, number> = {};
        guests.filter(g => g.is_coming === true && !g.is_baby_or_child && g.table_number).forEach(g => {
          const tableNum = g.table_number as string;
          tables[tableNum] = (tables[tableNum] || 0) + 1;
        });
        setTableData(Object.entries(tables).map(([name, value]) => ({ name, value })));

        setStats(prev => ({
          ...(prev || { totalSpent: 0, totalAllocated: 0, totalBudget: totalBudgetAccount }),
          totalGuests,
          attending,
          declined,
          pending,
          totalBudget: totalBudgetAccount
        }));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'guests');
      });

      const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snap) => {
        const suppliers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalAllocated = suppliers.reduce((acc, s: any) => acc + (s.budget || 0), 0);
        
        // Category Breakdown
        const cats: Record<string, number> = {};
        suppliers.forEach((s: any) => {
          cats[s.type] = (cats[s.type] || 0) + (s.budget || 0);
        });
        setBudgetData(Object.entries(cats).map(([name, value]) => ({ name, value })));

        setStats(prev => ({
          ...(prev || { totalGuests: 0, attending: 0, declined: 0, pending: 0, totalSpent: 0, totalBudget: totalBudgetAccount }),
          totalAllocated,
          totalBudget: totalBudgetAccount
        }));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'suppliers');
      });

      const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
        const payments = snap.docs.map(doc => doc.data());
        const totalSpent = payments.filter((p: any) => p.status === 'paid').reduce((acc, p: any) => acc + p.amount, 0);
        
        setStats(prev => ({
          ...(prev || { totalGuests: 0, attending: 0, declined: 0, pending: 0, totalAllocated: 0, totalBudget: totalBudgetAccount }),
          totalSpent,
          totalBudget: totalBudgetAccount
        }));
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'payments');
      });

      return () => {
        unsubGuests();
        unsubSuppliers();
        unsubPayments();
      };
    };

    fetchData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
      </div>
    );
  }

  const RSVP_COLORS = ['#10b981', '#f43f5e', '#f59e0b'];

  const rsvpPieData = [
    { name: 'Attending', value: stats.attending },
    { name: 'Declined', value: stats.declined },
    { name: 'Pending', value: stats.pending },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-4xl font-serif mb-2">Reports & Insights</h1>
        <p className="text-slate-500">Comprehensive overview of wedding logistics and finances.</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <Users className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirmed</p>
              <p className="text-2xl font-bold text-slate-800">{stats.attending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Ticket className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">RSVP Rate</p>
              <p className="text-2xl font-bold text-slate-800">
                {Math.round(((stats.attending + stats.declined) / (stats.totalGuests || 1)) * 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stats.totalBudget < stats.totalSpent ? 'bg-rose-50' : 'bg-wedding-gold/10'}`}>
              <Wallet className={`w-6 h-6 ${stats.totalBudget < stats.totalSpent ? 'text-rose-500' : 'text-wedding-gold'}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Budget Utilization</p>
              <p className={`text-2xl font-bold ${stats.totalBudget < stats.totalSpent ? 'text-rose-500' : 'text-slate-800'}`}>
                {Math.round((stats.totalSpent / (stats.totalBudget || 1)) * 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-purple-50 p-3 rounded-xl">
              <LayoutGrid className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tables Used</p>
              <p className="text-2xl font-bold text-slate-800">{tableData.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RSVP Status */}
        <Card className="border-none shadow-sm p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="font-serif">RSVP Distribution</CardTitle>
            <CardDescription>Response status of all invited guests</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rsvpPieData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {rsvpPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RSVP_COLORS[index % RSVP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget by Category */}
        <Card className="border-none shadow-sm p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="font-serif">Budget by Category</CardTitle>
            <CardDescription>Allocated amounts per supplier type</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                <Tooltip 
                  formatter={(value: number) => `₱${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#d4af37" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Guest Roles */}
        <Card className="border-none shadow-sm p-6 lg:col-span-2">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="font-serif">Guest Role Breakdown</CardTitle>
            <CardDescription>Distribution of roles across the guest list</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] px-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleData.sort((a, b) => b.value - a.value)}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-45} textAnchor="end" height={80} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#1e293b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Table Occupancy */}
        <Card className="border-none shadow-sm p-6 lg:col-span-2">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="font-serif">Table Occupancy</CardTitle>
            <CardDescription>Current guest count per assigned table (Attending only)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] px-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tableData.sort((a, b) => Number(a.name) - Number(b.name))}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#d4af37" fill="#d4af37" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center mt-12 opacity-30">
        <p className="text-xs font-serif italic text-wedding-gold tracking-widest">Polished with ♥ for Israel & Deborah</p>
      </div>
    </div>
  );
}
