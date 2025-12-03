import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Login from "./pages/Login";
import GuestHome from "./pages/GuestHome";
import Dashboard from "./pages/Dashboard";
import Guest from "./pages/Guest";
import Invite from "./pages/Invite";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedLayout from "./components/ProtectedLayout";

export default function App() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <Router>
        <Routes>
          {/* RSVP Website / Wedding Website */}
          <Route path="/" element={<GuestHome />} />
          
          {/* Login Page */}
          <Route path="/login" element={<Login />}/>

          {/* Admin Page */}
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/guests" element={<Guest />} />
              <Route path="/invites" element={<Invite />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
