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
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase';
import { useEffect, useState, Suspense } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Private browsing / storage-restricted contexts: collapse state just won't persist.
    }
  }, [collapsed]);

  const handleLogout = async () => {
    await auth.signOut();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Invitations', icon: Ticket, path: '/admin/invites' },
    { label: 'Guest List', icon: Users, path: '/admin/guests' },
    { label: 'Tables', icon: LayoutGrid, path: '/admin/tables' },
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
      <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'}`}>
        <div className={`flex items-center border-bottom border-slate-100 mb-8 ${collapsed ? 'justify-center p-4' : 'justify-between p-8'}`}>
          {!collapsed && (
            <div>
              <h2 className="font-serif text-2xl text-wedding-gold">Admin Panel</h2>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">I & D Wedding</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${collapsed ? 'justify-center' : ''} ${
                  isActive
                    ? 'bg-wedding-gold text-white shadow-lg shadow-wedding-gold/20'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="font-sans font-medium text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100">
          {!collapsed && (
            <div className="bg-slate-50 p-4 rounded-xl mb-4 overflow-hidden">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Logged in as</p>
              <p className="text-xs font-semibold text-slate-700 truncate">{user?.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full text-slate-400 hover:text-red-500 hover:bg-red-50 ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
            onClick={handleLogout}
          >
            <LogOut className={`w-4 h-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Sign Out'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-auto">
        <div className="lg:hidden flex items-center justify-between mb-8 px-4">
          <h2 className="font-serif text-2xl text-wedding-gold">Admin</h2>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
               <div className="p-8">
                <h2 className="font-serif text-2xl text-wedding-gold">Admin Panel</h2>
              </div>
              <nav className="px-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-wedding-gold mx-auto mt-20" />}>
          <motion.div
             key={location.pathname}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </Suspense>
      </main>
    </div>
  );
}
