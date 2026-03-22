import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Browse Cars", href: "/browse" },
  { label: "Sell Your Car", href: "/sell" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const Navbar = () => {

  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {

    setUser(null);

    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };

    getSession();

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
    setUser(null);
    navigate("/auth?mode=login");
  };

  const goToDashboard = () => {
    navigate("/dashboard/buyer");
  };

  const goToMessages = () => {
    navigate("/messages");
  };

  const handleNavigation = (href: string) => {

    if (href.startsWith("#")) {
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    navigate(href);
  };

  return (
    <header className="sticky top-0 z-50 glass-strong">

      <div className="container flex h-16 items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <Shield className="h-6 w-6 text-primary" />
          VerifyCar
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavigation(link.href)}
              className="text-sm hover:text-primary"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* DESKTOP ACTIONS */}
        <div className="hidden md:flex items-center gap-3">

          {user ? (
            <>
              {/* 🔥 MESSAGES */}
              <Button variant="ghost" size="sm" onClick={goToMessages}>
                <MessageCircle className="mr-1 h-4 w-4" />
                Messages
              </Button>

              <Button variant="ghost" size="sm" onClick={goToDashboard}>
                Dashboard
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
              <Menu />
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
                >
                  {link.label}
                </button>
              ))}

              <hr />

              {user ? (
                <>
                  {/* 🔥 MESSAGES MOBILE */}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      goToMessages();
                      setOpen(false);
                    }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Messages
                  </Button>

                  <Button
                    onClick={() => {
                      goToDashboard();
                      setOpen(false);
                    }}
                  >
                    Dashboard
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
                  <Button asChild>
                    <Link to="/auth?mode=login">Log In</Link>
                  </Button>

                  <Button asChild>
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