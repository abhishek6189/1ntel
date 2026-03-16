import { Link, useLocation } from "react-router-dom";

const DashboardSidebar = () => {
  const location = useLocation();

  const links = [
    { name: "Overview", path: "/dashboard" },
    { name: "My Cars", path: "/dashboard/cars" },
    { name: "Inspections", path: "/dashboard/inspections" },
    { name: "Saved Cars", path: "/dashboard/saved" },
    { name: "Settings", path: "/dashboard/settings" }
  ];

  return (
    <div className="w-64 bg-white border rounded-xl p-5 shadow-sm">

      <h2 className="font-semibold text-lg mb-4">
        Dashboard
      </h2>

      <div className="flex flex-col gap-2">

        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition
            ${
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