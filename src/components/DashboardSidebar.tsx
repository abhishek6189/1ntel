import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import GlobalLoader from "@/components/GlobalLoader";

const DashboardSidebar = () => {

  const location = useLocation();
  const [role, setRole] = useState<string>("buyer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const getRole = async () => {

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Role fetch error:", error);
        }

        setRole(data?.role || "buyer");

      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    getRole();

  }, []);

  /* ================= ROLE BASED LINKS ================= */

  const buyerLinks = [
    { name: "Overview", path: "/dashboard/buyer" },
    { name: "Saved Cars", path: "/dashboard/saved" },
    { name: "Inspections", path: "/dashboard/inspections" },
    { name: "Payments", path: "/dashboard/payments" },
    { name: "Settings", path: "/dashboard/settings" }
  ];

  const dealerLinks = [
    { name: "Overview", path: "/dashboard/seller" },
    { name: "My Listings", path: "/dashboard/cars" },
    { name: "Add Car", path: "/listing/new" },
    { name: "Analytics", path: "/dashboard/analytics" },
    { name: "Inspections", path: "/dashboard/inspections" },
    { name: "Settings", path: "/dashboard/settings" }
  ];

  const inspectorLinks = [
    { name: "Overview", path: "/dashboard/inspector" },
    { name: "Assigned Jobs", path: "/dashboard/inspections" },
    { name: "Upload Report", path: "/dashboard/reports" },
    { name: "History", path: "/dashboard/history" },
    { name: "Settings", path: "/dashboard/settings" }
  ];

  const adminLinks = [
    { name: "Overview", path: "/dashboard/admin" },
    { name: "Users", path: "/dashboard/users" },
    { name: "Cars", path: "/dashboard/cars" },
    { name: "Inspections", path: "/dashboard/inspections" },
    { name: "Payments", path: "/dashboard/payments" },
    { name: "Reports", path: "/dashboard/reports" }
  ];

  /* ================= SELECT LINKS ================= */

  let links = buyerLinks;

  if (role === "dealer") links = dealerLinks;
  if (role === "inspector") links = inspectorLinks;
  if (role === "admin") links = adminLinks;

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="w-full bg-white border rounded-xl p-5 shadow-sm lg:w-64 lg:shrink-0">
        <GlobalLoader className="py-4" sizeClassName="h-20 w-20" />
      </div>
    );
  }

  return (
    <div className="w-full bg-white border rounded-xl p-4 shadow-sm lg:w-64 lg:shrink-0 lg:p-5">

      <h2 className="font-semibold text-lg mb-4 capitalize">
        {role} Dashboard
      </h2>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">

        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition ${
              location.pathname === link.path
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            {link.name}
          </Link>
        ))}

      </div>

    </div>
  );
};

export default DashboardSidebar;
