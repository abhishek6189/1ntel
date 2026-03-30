import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

/* ✅ NEW */
import { ProfileProvider } from "@/context/ProfileContext";
import HowItWorks from "./pages/HowItWorks";
import SellerProfile from "./pages/SellerProfile";

/* PUBLIC */
import Index from "./pages/Index";
import BrowseCars from "./pages/BrowseCars";
import CarDetail from "./pages/CarDetail";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";

/* MESSAGING */
import ChatPage from "./pages/ChatPage";
import Messages from "./pages/Messages";

/* DASHBOARDS */
import Dashboard from "./pages/dashboard/Dashboard";
import DealerDashboard from "./pages/dashboard/DealerDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import InspectorDashboard from "./pages/dashboard/InspectorDashboard";

/* 🔥 FIXED IMPORTS */
import CreateListing from "./pages/CreateListing";
import ProfileSettings from "./pages/ProfileSettings";

/* OTHER */
import NotFound from "./pages/NotFound";

/* ROUTES */
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import InspectorRoute from "@/components/InspectorRoute";
import SellerRoute from "@/components/SellerRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      {/* ✅ GLOBAL PROFILE CONTEXT */}
      <ProfileProvider>

        <BrowserRouter>
          <Routes>

            {/* ================= PUBLIC ================= */}
            <Route path="/" element={<Index />} />
            <Route path="/browse" element={<BrowseCars />} />
            <Route path="/car/:id" element={<CarDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/sell" element={<Pricing />} />

            {/* ================= MESSAGING ================= */}
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat/:id"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />

            {/* ================= USER DASHBOARD ================= */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
           
             {/* ================= SELLER PROFILE ================= */}
             
            <Route path="/seller/:id" element={<SellerProfile />} />

            {/* ================= CREATE LISTING ================= */}
            <Route
              path="/dashboard/create-listing"
              element={
                <ProtectedRoute>
                  <CreateListing />
                </ProtectedRoute>
              }
            />

            {/* ================= PROFILE SETTINGS ================= */}
            <Route
              path="/profile-settings"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />

            {/* ================= DEALER DASHBOARD ================= */}
            <Route
              path="/dealer-dashboard"
              element={
                <SellerRoute>
                  <DealerDashboard />
                </SellerRoute>
              }
            />

            {/* ================= ADMIN ================= */}
            <Route
              path="/dashboard/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            {/* ================= How it works ================= */}

            <Route path="/how-it-works" element={<HowItWorks />} />

            {/* ================= INSPECTOR ================= */}
            <Route
              path="/dashboard/inspector"
              element={
                <InspectorRoute>
                  <InspectorDashboard />
                </InspectorRoute>
              }
            />

            {/* ================= 404 ================= */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </BrowserRouter>

      </ProfileProvider>

    </TooltipProvider>
  </QueryClientProvider>
);

export default App;