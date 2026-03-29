import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Shield,
  MessageCircle,
  LayoutDashboard,
  Inbox,
  Settings,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ✅ NEW */
import { useProfile } from "@/context/ProfileContext";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Browse Cars", href: "/browse" },
  { label: "Sell Your Car", href: "/sell" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const Navbar = () => {
  /* ✅ GLOBAL USER + PROFILE */
  const { user, profile } = useProfile();

  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);

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

  /* ✅ UPDATE WHEN USER CHANGES */
  useEffect(() => {
    if (user) {
      fetchUnreadChats(user);
    }
  }, [user]);

  /* ================= ACTIONS ================= */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth?mode=login");
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
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <Shield className="h-6 w-6 text-blue-600" />
          VerifyCar
        </Link>

        {/* NAV LINKS */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavigation(link.href)}
              className="text-sm hover:text-blue-600"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* RIGHT SIDE */}
        <div className="hidden md:flex items-center gap-4">

          {/* MESSAGES */}
          {user && (
            <div
              className="relative cursor-pointer"
              onClick={() => navigate("/messages")}
            >
              <MessageCircle className="h-5 w-5" />

              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          )}

          {/* PROFILE */}
          {user && (
            <div className="relative">

              {/* PROFILE BUTTON */}
              <div
                onClick={() => setDropdown(!dropdown)}
                className="flex items-center gap-2 cursor-pointer"
              >
                {/* ✅ AVATAR FROM DB */}
                <img
                  src={profile?.avatar_url || "https://i.pravatar.cc/100"}
                  className="w-8 h-8 rounded-full object-cover"
                />

                {/* ✅ USERNAME FROM DB (NO @) */}
                <span className="text-sm">
                  {profile?.full_name || user?.email?.split("@")[0]}
                </span>
              </div>

              {/* DROPDOWN */}
              {dropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg p-3">

                  <p className="font-semibold">
                    {profile?.full_name || "User"}
                  </p>

                  <p className="text-xs text-gray-500 mb-2">
                    {user?.email}
                  </p>

                  <hr className="my-2" />

                  <div className="space-y-1 text-sm">

                    <div
                      onClick={() => {
                        navigate("/dashboard");
                        setDropdown(false);
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </div>

                    <div
                      onClick={() => {
                        navigate("/messages");
                        setDropdown(false);
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <Inbox size={16} />
                      Inbox
                    </div>

                    <div
                      onClick={() => {
                        navigate("/profile-settings");
                        setDropdown(false);
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <Settings size={16} />
                      Profile Settings
                    </div>

                    <div
                      onClick={handleLogout}
                      className="flex items-center gap-2 p-2 hover:bg-red-50 rounded text-red-500 cursor-pointer"
                    >
                      <LogOut size={16} />
                      Log out
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {!user && (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth?mode=login">Log In</Link>
              </Button>
              <Button asChild>
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
                  <Button onClick={() => navigate("/dashboard")}>
                    Dashboard
                  </Button>

                  <Button onClick={() => navigate("/messages")}>
                    Messages ({unreadCount})
                  </Button>

                  <Button variant="outline" onClick={handleLogout}>
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