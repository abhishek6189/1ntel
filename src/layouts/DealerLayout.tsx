import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  MessageCircle,
  BarChart3,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DealerLayout = () => {

  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/auth?mode=login");
  };

  return (
    <div className="flex h-screen bg-gray-100">

      {/* SIDEBAR */}
      <div className="w-64 bg-white shadow-lg p-5 flex flex-col">

        {/* LOGO */}
        <div className="text-2xl font-bold mb-8">
          1ntel Dealer
        </div>

        {/* NAV */}
        <nav className="flex flex-col gap-3 text-sm">

          {/* DASHBOARD */}
          <NavLink
            to="/dealer-dashboard"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100"
              }`
            }
          >
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>

          {/* LISTINGS */}
          <NavLink
            to="/dealer-dashboard/listings"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100"
              }`
            }
          >
            <Car size={16} /> Listings
          </NavLink>

          {/* MESSAGES */}
          <NavLink
            to="/dealer-dashboard/messages"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100"
              }`
            }
          >
            <MessageCircle size={16} /> Messages
          </NavLink>

          {/* ANALYTICS */}
          <NavLink
            to="/dealer-dashboard/analytics"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100"
              }`
            }
          >
            <BarChart3 size={16} /> Analytics
          </NavLink>

        </nav>

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="mt-auto flex items-center gap-2 text-red-500 hover:opacity-80"
        >
          <LogOut size={16} /> Logout
        </button>

      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </div>

    </div>
  );
};

export default DealerLayout;