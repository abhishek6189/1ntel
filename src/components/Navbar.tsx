import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  MessageCircle,
  LayoutDashboard,
  Inbox,
  Settings,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/context/ProfileContext";
import BrandLogo from "@/components/BrandLogo";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Browse Cars", href: "/browse" },
  { label: "Sell Your Car", href: "/sell", requiresAuth: true },
  { label: "How It Works", href: "/how-it-works" },
  { label: "1ne+", href: "/pricing" },
];

const OnePlusLabel = () => (
  <span className="inline-flex items-baseline font-bold text-black">
    <span>1ne</span>
    <span className="text-blue-600">+</span>
  </span>
);

const Navbar = () => {
  const { user, profile } = useProfile();
  const visibleNavLinks = navLinks.filter((link) => !link.requiresAuth || user);

  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);

  const dropdownRef = useRef<any>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const goToDashboard = () => {
  if (profile?.role === "dealer") {
    navigate("/dealer-dashboard");
  } else if (profile?.role === "admin") {
    navigate("/admin");
  } else {
    navigate("/dashboard");
  }
};

  /* ================= FETCH UNREAD ================= */
  const fetchUnreadChats = async (currentUser: any) => {
    if (!currentUser) return;

    try {
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
    } catch (err) {
      console.error("Unread fetch error:", err);
    }
  };

  /* ================= EFFECTS ================= */
  useEffect(() => {
    if (user) fetchUnreadChats(user);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`navbar-unread-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          fetchUnreadChats(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        {/* ✅ UPDATED LOGO */}
        <Link
          to="/"
          className="flex items-center gap-2 cursor-pointer"
        >
          <BrandLogo className="text-[3.25rem]" />
        </Link>

        {/* NAV LINKS */}
        <nav className="hidden md:flex items-center gap-6">
          {visibleNavLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavigation(link.href)}
              className={
                link.label === "1ne+"
                  ? "text-sm transition hover:scale-105"
                  : "text-sm hover:text-blue-600 transition"
              }
            >
              {link.label === "1ne+" ? <OnePlusLabel /> : link.label}
            </button>
          ))}
        </nav>

        {/* RIGHT SIDE */}
        <div className="hidden md:flex items-center gap-4">

          {/* MESSAGES */}
          {user && (
            <div
              className="relative cursor-pointer rounded-full p-2 transition hover:bg-slate-100"
              onClick={() => navigate("/messages")}
            >
              <MessageCircle className="h-5 w-5" />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          )}

          {/* PROFILE */}
          {user && (
            <div className="relative" ref={dropdownRef}>

              <div
                onClick={() => setDropdown(!dropdown)}
                className="flex items-center gap-2 cursor-pointer"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-full text-sm">
                    {(profile?.full_name || user?.email?.[0] || "U")[0].toUpperCase()}
                  </div>
                )}

                <span className="text-sm">
                  {profile?.full_name || user?.email?.split("@")[0]}
                </span>
              </div>

              {/* DROPDOWN */}
              {dropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg p-3 z-50">

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
                      goToDashboard();   // ✅ yaha change
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

              {visibleNavLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    handleNavigation(link.href);
                    setOpen(false);
                  }}
                  className={
                    link.label === "1ne+"
                      ? "flex justify-center py-1"
                      : ""
                  }
                >
                  {link.label === "1ne+" ? <OnePlusLabel /> : link.label}
                </button>
              ))}

              <hr />

              {user ? (
                <>
                  <div className="rounded-xl border bg-gray-50 p-3">
                    <div className="flex items-center gap-3">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-base font-semibold text-white">
                          {(profile?.full_name || user?.email?.[0] || "U")[0].toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {profile?.full_name || "User"}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      goToDashboard();
                      setOpen(false);
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>

                  <Button
                    onClick={() => {
                      navigate("/messages");
                      setOpen(false);
                    }}
                  >
                    <Inbox className="h-4 w-4" />
                    Messages ({unreadCount})
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      navigate("/profile-settings");
                      setOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    Profile Settings
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      handleLogout();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4" />
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
