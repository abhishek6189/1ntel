import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";

const Messages = () => {

  const [conversations, setConversations] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  useEffect(() => {

    const load = async () => {

      const client: any = supabase;

      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUser(currentUser);

      if (!currentUser) return;

      const { data: convos } = await client
        .from("chat_conversations")
        .select("*")
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order("updated_at", { ascending: false });

      if (!convos) return;

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
            .select("username, full_name, avatar_url, last_seen")
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
            unread: count || 0
          };
        })
      );

      setConversations(enriched);
      setFiltered(enriched);
      setLoading(false);
    };

    load();

  }, []);

  /* SEARCH */
  useEffect(() => {
    if (!search) {
      setFiltered(conversations);
    } else {
      const s = search.toLowerCase();

      setFiltered(
        conversations.filter((c) =>
          (c.profile?.username || "")
            .toLowerCase()
            .includes(s) ||
          (c.profile?.full_name || "")
            .toLowerCase()
            .includes(s) ||
          (c.car?.title || "")
            .toLowerCase()
            .includes(s)
        )
      );
    }
  }, [search, conversations]);

  /* FORMAT TIME */
  const formatTime = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  /* ONLINE */
  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 15000;
  };

  /* NAME FIX */
  const getName = (profile: any) => {
    return (
      profile?.username ||
      profile?.full_name ||
      "User"
    );
  };

  /* MESSAGE PREVIEW */
  const getPreview = (msg: any) => {
    if (!msg) return "Start conversation";

    if (msg.file_url) {
      if (msg.file_type?.startsWith("image")) return "📷 Photo";
      if (msg.file_type?.startsWith("audio")) return "🎤 Voice message";
      return "📎 File";
    }

    return msg.message;
  };

  return (
    <div className="min-h-screen bg-gray-100">

      <Navbar />

      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3">

        {/* HEADER */}
        <div className="sticky top-16 bg-gray-100 z-10 pb-3">
          <h1 className="text-xl sm:text-2xl font-bold mb-3">
            Messages
          </h1>

          <input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-full bg-white border outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
        </div>

        {/* LOADING */}
        {loading ? (
          <p className="text-center text-gray-500 mt-10">
            Loading chats...
          </p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              No conversations yet 🚀
            </p>
          </div>
        ) : (
          <div className="space-y-2 mt-3">

            {filtered.map((c) => {

              const isUnread = c.unread > 0;
              const online = isOnline(c.profile?.last_seen);

              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/chat/${c.id}`)}
                  className={`bg-white p-3 sm:p-4 rounded-xl flex items-center gap-3 cursor-pointer transition hover:shadow-md active:scale-[0.99] ${
                    isUnread ? "border-l-4 border-blue-500" : ""
                  }`}
                >

                  {/* AVATAR */}
                  <div className="relative flex-shrink-0">
                    {c.profile?.avatar_url ? (
                      <img
                        src={c.profile.avatar_url}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 text-white flex items-center justify-center rounded-full font-semibold">
                        {getName(c.profile)[0].toUpperCase()}
                      </div>
                    )}

                    {online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* CONTENT */}
                  <div className="flex-1 min-w-0">

                    <div className="flex justify-between items-center">

                      <p className={`truncate text-sm sm:text-base ${
                        isUnread ? "font-bold" : "font-semibold"
                      }`}>
                        {getName(c.profile)}
                      </p>

                      <p className="text-[10px] sm:text-xs text-gray-400 ml-2 whitespace-nowrap">
                        {formatTime(c.lastMsg?.created_at)}
                      </p>

                    </div>

                    <p className="text-xs text-gray-500 truncate">
                      {c.car?.title || "Car"}
                    </p>

                    <p className={`text-xs sm:text-sm truncate mt-1 ${
                      isUnread ? "font-semibold text-black" : "text-gray-600"
                    }`}>
                      {getPreview(c.lastMsg)}
                    </p>

                  </div>

                  {/* UNREAD */}
                  {isUnread && (
                    <div className="bg-blue-600 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full font-semibold">
                      {c.unread}
                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>

    </div>
  );
};

export default Messages;