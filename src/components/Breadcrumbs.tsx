import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const Breadcrumbs = () => {

const location = useLocation();

const pathnames = location.pathname.split("/").filter(Boolean);

return (


<nav className="flex items-center text-sm text-muted-foreground mb-6">

  <Link
    to="/"
    className="flex items-center gap-1 hover:text-primary transition"
  >
    <Home size={16} />
    Home
  </Link>

  {pathnames.map((value, index) => {

    const to = "/" + pathnames.slice(0, index + 1).join("/");

    const isLast = index === pathnames.length - 1;

    const label =
      value
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

    return (

      <span key={to} className="flex items-center">

        <ChevronRight
          size={16}
          className="mx-2 text-gray-400"
        />

        {isLast ? (

          <span className="font-medium text-foreground">
            {label}
          </span>

        ) : (

          <Link
            to={to}
            className="hover:text-primary transition"
          >
            {label}
          </Link>

        )}

      </span>

    );

  })}

</nav>


);

};

export default Breadcrumbs;
