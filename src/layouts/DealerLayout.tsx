import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Car,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { to: "/dealer-dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dealer-dashboard/listings", label: "Listings", icon: Car },
  { to: "/dealer-dashboard/messages", label: "Messages", icon: MessageCircle },
  { to: "/dealer-dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

const DealerLayout = () => {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/auth?mode=login");
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="mb-8 flex items-end gap-2">
        <BrandLogo className="text-4xl" />
        <span className="pb-1 text-sm font-semibold text-slate-500">Dealer</span>
      </div>

      <nav className="flex flex-col gap-2 text-sm">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
      >
        <LogOut size={17} />
        Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <aside className="hidden w-64 shrink-0 bg-white p-5 shadow-lg md:block">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm md:hidden">
        <div className="flex items-end gap-2">
          <BrandLogo className="text-4xl" />
          <span className="pb-1 text-xs font-semibold text-slate-500">Dealer</span>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open dealer menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[86vw] max-w-xs p-5">
            <SheetHeader className="sr-only">
              <SheetTitle>Dealer menu</SheetTitle>
            </SheetHeader>
            {sidebar}
          </SheetContent>
        </Sheet>
      </header>

      <main className="min-w-0 flex-1 p-3 sm:p-4 md:h-screen md:overflow-y-auto md:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default DealerLayout;
