import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LandingPage from '@/pages/LandingPage';

const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminInvites = lazy(() => import('@/pages/admin/AdminInvites'));
const AdminGuests = lazy(() => import('@/pages/admin/AdminGuests'));
const AdminTables = lazy(() => import('@/pages/admin/AdminTables'));
const AdminBudget = lazy(() => import('@/pages/admin/AdminBudget'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminWaitingList = lazy(() => import('@/pages/admin/AdminWaitingList'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));

function RSVPRedirect() {
  const { inviteId } = useParams();
  const search = window.location.search;

  // If search already contains ? prefix, replace it with & to append to inviteUrl
  const cleanSearch = search ? search.replace(/^\?/, '&') : '';

  return <Navigate to={`/?inviteUrl=${inviteId}${cleanSearch}`} replace />;
}

function AdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<AdminFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/rsvp/:inviteId" element={<RSVPRedirect />} />
            <Route path="/rsvp/:inviteId/" element={<RSVPRedirect />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="invites" element={<AdminInvites />} />
              <Route path="guests" element={<AdminGuests />} />
              <Route path="tables" element={<AdminTables />} />
              <Route path="waiting-list" element={<AdminWaitingList />} />
              <Route path="budget" element={<AdminBudget />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
