import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LandingPage from '@/pages/LandingPage';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminInvites from '@/pages/admin/AdminInvites';
import AdminGuests from '@/pages/admin/AdminGuests';
import AdminTables from '@/pages/admin/AdminTables';
import AdminBudget from '@/pages/admin/AdminBudget';
import AdminReports from '@/pages/admin/AdminReports';
import AdminWaitingList from '@/pages/admin/AdminWaitingList';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminLogin from '@/pages/admin/AdminLogin';

function RSVPRedirect() {
  const { inviteId } = useParams();
  const search = window.location.search;
  
  // If search already contains ? prefix, replace it with & to append to inviteUrl
  const cleanSearch = search ? search.replace(/^\?/, '&') : '';
  
  return <Navigate to={`/?inviteUrl=${inviteId}${cleanSearch}`} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
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
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
