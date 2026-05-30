import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import GlobalLoader from "@/components/GlobalLoader";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_AVATAR_URL } from "@/utils/imageFiles";

const Messages = ({ hideNavbar = false }: { hideNavbar?: boolean }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  const loadConversations = async (currentUser = user) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const client: any = supabase;

    const { data: convos } = await client
      .from("chat_conversations")
      .select("*")
      .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
      .order("updated_at", { ascending: false });

    if (!convos) {
      setConversations([]);
      setFiltered([]);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      convos.map(async (c: any) => {
        const { data: car } = await supabase
          .from("cars")
          .select("title, image_url")
          .eq("id", c.car_id)
          .single();

        const { data: lastMsg } = await client
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const otherUserId =
          c.buyer_id === currentUser.id ? c.seller_id : c.buyer_id;

        const { data: profile } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", otherUserId)
          .single();

        const { count } = await client
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .eq("is_read", false)
          .neq("sender_id", currentUser.id);

        return {
          ...c,
          car,
          lastMsg,
          profile,
          unread: count || 0,
        };
      })
    );

    setConversations(enriched);
    setFiltered(enriched);
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      await loadConversations(data.user);
    };

    load();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-inbox-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          loadConversations(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!search) {
      setFiltered(conversations);
      return;
    }

    const s = search.toLowerCase();

    setFiltered(
      conversations.filter((c) =>
        (c.profile?.username || "").toLowerCase().includes(s) ||
        (c.profile?.full_name || "").toLowerCase().includes(s) ||
        (c.car?.title || "").toLowerCase().includes(s) ||
        (c.lastMsg?.message || c.lastMsg?.content || "").toLowerCase().includes(s)
      )
    );
  }, [search, conversations]);

  const formatTime = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getName = (profile: any) =>
    profile?.full_name || profile?.username || "User";

  const getPreview = (msg: any) => {
    if (!msg) return "Start conversation";
    if (msg.file_url) return "Attachment removed";
    return msg.message || msg.content || "Message";
  };

  return (
    <div className={`${hideNavbar ? "h-full" : "min-h-screen bg-slate-100"}`}>
      {!hideNavbar && <Navbar />}

      <div className={`${hideNavbar ? "p-0" : "mx-auto max-w-5xl px-3 py-5 sm:px-5 sm:py-7"}`}>
        <div className={`${hideNavbar ? "" : "sticky top-16 z-10 -mx-3 bg-slate-100/95 px-3 pb-4 backdrop-blur sm:-mx-5 sm:px-5"}`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Messages</h1>
              <p className="mt-1 text-sm text-slate-500">
                Keep track of buyer and seller conversations.
              </p>
            </div>
            <div className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#00357a] shadow-sm sm:block">
              {conversations.length} chats
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search chats, cars, or messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-14 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base outline-none shadow-sm transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {loading ? (
          <GlobalLoader className="min-h-[24rem]" />
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#00357a]">
              <MessageCircle className="h-7 w-7" />
            </div>
            <p className="font-semibold text-slate-950">No conversations found</p>
            <p className="mt-1 text-sm text-slate-500">
              New buyer or seller chats will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((c) => {
              const isUnread = c.unread > 0;
              const preview = getPreview(c.lastMsg);

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/chat/${c.id}`)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:translate-y-0 ${
                    isUnread ? "border-blue-200 ring-1 ring-blue-100" : "border-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={c.profile?.avatar_url || FALLBACK_AVATAR_URL}
                      className="h-14 w-14 rounded-full border border-slate-200 object-cover sm:h-16 sm:w-16"
                    />
                    {isUnread && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white ring-2 ring-white">
                        {c.unread > 9 ? "9+" : c.unread}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate text-base ${
                          isUnread ? "font-bold text-slate-950" : "font-semibold text-slate-900"
                        }`}>
                          {getName(c.profile)}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {c.car?.title || "Vehicle conversation"}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs font-medium text-slate-400">
                        {formatTime(c.lastMsg?.created_at)}
                      </p>
                    </div>

                    <p className={`mt-2 truncate text-sm ${
                      isUnread ? "font-semibold text-slate-950" : "text-slate-500"
                    }`}>
                      {preview}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
