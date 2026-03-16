import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

const navLinks = [
{ label: "Home", href: "/" },
{ label: "Browse Cars", href: "/browse" },
{ label: "Sell Your Car", href: "/sell" },
{ label: "How It Works", href: "#how-it-works" },
{ label: "Pricing", href: "/pricing" },
];

const Navbar = () => {

const [open, setOpen] = useState(false);
const [user, setUser] = useState<any>(null);

const location = useLocation();
const navigate = useNavigate();

useEffect(() => {


const getUser = async () => {
  const { data } = await supabase.auth.getUser();
  setUser(data.user);
};

getUser();

const { data: listener } = supabase.auth.onAuthStateChange(
  (_event, session) => {
    setUser(session?.user ?? null);
  }
);

return () => {
  listener.subscription.unsubscribe();
};


}, []);

const handleLogout = async () => {
await supabase.auth.signOut();
navigate("/");
};

/* HANDLE NAVIGATION */

const handleNavigation = (href: string) => {


// HANDLE SECTION SCROLL
if (href.startsWith("#")) {

  if (location.pathname !== "/") {
    navigate("/");
    setTimeout(() => {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  } else {
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  }

  return;
}

navigate(href);


};

return (


<header className="sticky top-0 z-50 glass-strong">

  <div className="container flex h-16 items-center justify-between">

    {/* LOGO */}

    <Link
      to="/"
      className="flex items-center gap-2 font-heading text-xl font-bold"
    >
      <Shield className="h-6 w-6 text-primary" />
      <span>VerifyCar</span>
    </Link>

    {/* DESKTOP NAV */}

    <nav className="hidden md:flex items-center gap-6">

      {navLinks.map((link) => (

        <button
          key={link.label}
          onClick={() => handleNavigation(link.href)}
          className={`text-sm font-medium transition-colors hover:text-primary ${
            location.pathname === link.href
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        >
          {link.label}
        </button>

      ))}

    </nav>

    {/* AUTH BUTTONS */}

    <div className="hidden md:flex items-center gap-3">

      {user ? (
        <>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>

          <Button size="sm" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth?mode=login">Log In</Link>
          </Button>

          <Button size="sm" asChild>
            <Link to="/auth?mode=signup">Sign Up</Link>
          </Button>
        </>
      )}

    </div>

    {/* MOBILE MENU */}

    <Sheet open={open} onOpenChange={setOpen}>

      <SheetTrigger asChild className="md:hidden">

        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>

      </SheetTrigger>

      <SheetContent side="right" className="w-72">

        <div className="flex flex-col gap-4 mt-8">

          {navLinks.map((link) => (

            <button
              key={link.label}
              onClick={() => {
                handleNavigation(link.href);
                setOpen(false);
              }}
              className="text-left text-base font-medium py-2 hover:text-primary transition-colors"
            >
              {link.label}
            </button>

          ))}

          <hr className="my-2 border-border" />

          {user ? (
            <>
              <Button asChild onClick={() => setOpen(false)}>
                <Link to="/dashboard">Dashboard</Link>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  handleLogout();
                  setOpen(false);
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild onClick={() => setOpen(false)}>
                <Link to="/auth?mode=login">Log In</Link>
              </Button>

              <Button asChild onClick={() => setOpen(false)}>
                <Link to="/auth?mode=signup">Sign Up</Link>
              </Button>
            </>
          )}

        </div>

      </SheetContent>

    </Sheet>

  </div>

</header>


);

};

export default Navbar;
