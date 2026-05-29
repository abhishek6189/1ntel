import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

/* ✅ NEW */
import { ProfileProvider } from "@/context/ProfileContext";
import HowItWorks from "./pages/HowItWorks";
import SellerProfile from "./pages/SellerProfile";
import DealerPending from "@/pages/dealer/DealerPending";
import DealerSetup from "@/pages/dealer/DealerSetup";
import DealerRegistration from "@/pages/dealer/DealerSetup";
import DealerAuth from "@/pages/dealer/DealerAuth";
import Admin from "./pages/Admin";

/* PUBLIC */
import Index from "./pages/Index";
import BrowseCars from "./pages/BrowseCars";
import CarDetail from "./pages/CarDetail";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";

/* MESSAGING */
import ChatPage from "./pages/ChatPage";
import Messages from "./pages/Messages";

/* DASHBOARDS */
import Dashboard from "./pages/dashboard/Dashboard";
import DealerDashboard from "./pages/dashboard/DealerDashboard";
import InspectorDashboard from "./pages/dashboard/InspectorDashboard";

/* 🔥 NEW DEALER SYSTEM */
import DealerLayout from "@/layouts/DealerLayout";
import DealerListings from "@/pages/dealer/DealerListings";

/* ✅ ADD THESE (IMPORTANT FIX) */
import DealerMessages from "@/pages/dealer/DealerMessages";
import DealerAnalytics from "@/pages/dealer/DealerAnalytics";

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
import AccountStatusGuard from "@/components/AccountStatusGuard";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <ProfileProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AccountStatusGuard />
          <Routes>
            {/* ================= PUBLIC ================= */}
            <Route path="/" element={<Index />} />
            <Route path="/browse" element={<BrowseCars />} />
            <Route path="/car/:id" element={<CarDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route
              path="/sell"
              element={
                <ProtectedRoute>
                  <CreateListing />
                </ProtectedRoute>
              }
            />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />

            {/* ================= DEALER AUTH ================= */}
            <Route path="/dealer-auth" element={<DealerAuth />} />
            <Route path="/dealer-registration" element={<DealerRegistration />} />

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
                  <DealerLayout />
                </SellerRoute>
              }
            >
              <Route index element={<DealerDashboard />} />
              <Route path="listings" element={<DealerListings />} />
              <Route path="messages" element={<DealerMessages />} />
              <Route path="analytics" element={<DealerAnalytics />} />
            </Route>

            {/* ================= ADMIN ================= */}
            <Route
              path="/dashboard/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />

            {/* ================= HOW IT WORKS ================= */}
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

            <Route path="/dealer-dashboard/chat/:id" element={<ChatPage hideNavbar />} />

            {/* TEMP: Profile setup disabled to prevent dealer accounts becoming buyers */}
            <Route path="/profile-setup" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dealer-profile-setup" element={<DealerSetup />} />
            <Route path="/dealer-pending" element={<DealerPending />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
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
