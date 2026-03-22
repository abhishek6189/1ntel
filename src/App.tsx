import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Index from "./pages/Index";
import BrowseCars from "./pages/BrowseCars";
import CarDetail from "./pages/CarDetail";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";

/* 🔥 NEW PAGES */
import ChatPage from "./pages/ChatPage";
import Messages from "./pages/Messages";

/* DASHBOARD */
import BuyerOverview from "./pages/dashboard/BuyerOverview";
import SavedCars from "./pages/dashboard/SavedCars";
import BuyerInspections from "./pages/dashboard/BuyerInspections";
import BuyerPayments from "./pages/dashboard/BuyerPayments";
import BuyerSettings from "./pages/dashboard/BuyerSettings";

import SellerDashboard from "./pages/dashboard/SellerDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import InspectorDashboard from "./pages/dashboard/InspectorDashboard";

/* OTHER */
import CreateListing from "./pages/CreateListing";
import NotFound from "./pages/NotFound";

/* 🔐 ROUTES */
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

          {/* 🔥 Inbox */}
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />

          {/* 🔥 Chat */}
          <Route
            path="/chat/:id"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />

          {/* ================= DASHBOARD ROOT ================= */}
          <Route
            path="/dashboard"
            element={<Navigate to="/dashboard/buyer" replace />}
          />

          {/* ================= BUYER ================= */}
          <Route
            path="/dashboard/buyer"
            element={
              <ProtectedRoute>
                <BuyerOverview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/saved"
            element={
              <ProtectedRoute>
                <SavedCars />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/inspections"
            element={
              <ProtectedRoute>
                <BuyerInspections />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/payments"
            element={
              <ProtectedRoute>
                <BuyerPayments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <BuyerSettings />
              </ProtectedRoute>
            }
          />

          {/* ================= SELLER ================= */}
          <Route
            path="/dashboard/seller"
            element={
              <SellerRoute>
                <SellerDashboard />
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

          {/* ================= INSPECTOR ================= */}
          <Route
            path="/dashboard/inspector"
            element={
              <InspectorRoute>
                <InspectorDashboard />
              </InspectorRoute>
            }
          />

          {/* ================= LISTINGS ================= */}
          <Route
            path="/listing/new"
            element={
              <ProtectedRoute>
                <CreateListing />
              </ProtectedRoute>
            }
          />

          {/* ================= 404 ================= */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;