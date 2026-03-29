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
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  /* ================= FETCH UNREAD ================= */
  const fetchUnreadChats = async (currentUser: any) => {
    if (!currentUser) return;

    const { data: conversations } = await supabase
      .from("chat_conversations")
      .select("id")
      .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`);

    const convoIds = conversations?.map((c: any) => c.id) || [];

    if (convoIds.length === 0) {
      setUnreadCount(0);
      return;
    }

    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("conversation_id")
      .in("conversation_id", convoIds)
      .eq("is_read", false)
      .neq("sender_id", currentUser.id);

    const uniqueChats = new Set(msgs?.map((m: any) => m.conversation_id));

    setUnreadCount(uniqueChats.size);
  };

  /* ================= INIT ================= */
  useEffect(() => {

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user;

      setUser(currentUser);

      if (currentUser) {
        await fetchUnreadChats(currentUser);
      }
    };

    init();

    const channel = supabase
      .channel("navbar-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) fetchUnreadChats(data.session.user);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) fetchUnreadChats(data.session.user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, []);

  /* ================= ACTIONS ================= */

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth?mode=login");
  };

  /* 🔥 FIXED DASHBOARD REDIRECT (ROLE BASED) */
  const goToDashboard = async () => {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "dealer") {
      navigate("/dealer-dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  const goToMessages = () => {
    setUnreadCount(0);
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

  /* ================= UI ================= */

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="container flex h-16 items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <Shield className="h-6 w-6 text-primary" />
          VerifyCar
        </Link>

        {/* NAV */}
        <nav className="hidden md:flex gap-6">
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

        {/* ACTIONS */}
        <div className="hidden md:flex items-center gap-4">

          {user && (
            <div
              className="relative cursor-pointer"
              onClick={goToMessages}
            >
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          )}

          {user ? (
            <>
              <Button onClick={goToDashboard}>
                Dashboard
              </Button>

              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth?mode=login">Login</Link>
              </Button>

              <Button asChild>
                <Link to="/auth?mode=signup">Sign Up</Link>
              </Button>
            </>
          )}

        </div>

        {/* MOBILE */}
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

              {user && (
                <>
                  <Button onClick={goToMessages}>
                    Messages ({unreadCount})
                  </Button>

                  <Button onClick={goToDashboard}>
                    Dashboard
                  </Button>

                  <Button variant="outline" onClick={handleLogout}>
                    Logout
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