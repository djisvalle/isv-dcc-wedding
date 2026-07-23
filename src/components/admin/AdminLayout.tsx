import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, 
  Ticket, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  Loader2,
  Settings,
  LayoutGrid,
  Wallet,
  BarChart3,
  Hourglass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, loading, navigate]);

  const handleLogout = async () => {
    await auth.signOut();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Invitations', icon: Ticket, path: '/admin/invites' },
    { label: 'Guest List', icon: Users, path: '/admin/guests' },
    { label: 'Waiting List', icon: Hourglass, path: '/admin/waiting-list' },
    { label: 'Tables', icon: LayoutGrid, path: '/admin/tables' },
    { label: 'Budget & Payments', icon: Wallet, path: '/admin/budget' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col">
        <div className="p-8 border-b border-slate-100 mb-8">
          <h2 className="font-serif text-2xl text-wedding-gold">Admin Panel</h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">I & D Wedding</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-wedding-gold text-white shadow-lg shadow-wedding-gold/20' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-sans font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl mb-4 overflow-hidden">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Logged in as</p>
            <p className="text-xs font-semibold text-slate-700 truncate">{user?.email}</p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-red-500 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-auto">
        <div className="lg:hidden flex items-center justify-between mb-8 px-4">
          <h2 className="font-serif text-2xl text-wedding-gold">Admin</h2>
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
               <div className="p-8">
                <h2 className="font-serif text-2xl text-wedding-gold">Admin Panel</h2>
              </div>
              <nav className="px-4 space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-wedding-gold text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-400 hover:text-red-500 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <motion.div
           key={location.pathname}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
