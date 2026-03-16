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

import BuyerDashboard from "./pages/dashboard/BuyerDashboard";
import SellerDashboard from "./pages/dashboard/SellerDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import InspectorDashboard from "./pages/dashboard/InspectorDashboard";

import CreateListing from "./pages/CreateListing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <Routes>

          {/* Public Pages */}
          <Route path="/" element={<Index />} />
          <Route path="/browse" element={<BrowseCars />} />
          <Route path="/car/:id" element={<CarDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/sell" element={<Pricing />} />
          <Route path="/dashboard" element={<BuyerDashboard />} />
          <Route path="/dashboard/cars" element={<SellerDashboard />} />
          <Route path="/dashboard/inspections" element={<InspectorDashboard />} />
          <Route path="/dashboard/saved" element={<BrowseCars />} />
          <Route path="/dashboard/settings" element={<Auth />} />

          {/* Dashboard Redirect */}
          <Route path="/dashboard" element={<Navigate to="/dashboard/buyer" />} />

          {/* Dashboards */}
          <Route path="/dashboard/buyer" element={<BuyerDashboard />} />
          <Route path="/dashboard/seller" element={<SellerDashboard />} />
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/dashboard/inspector" element={<InspectorDashboard />} />

          {/* Listings */}
          <Route path="/listing/new" element={<CreateListing />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;