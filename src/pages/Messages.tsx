import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";

const Messages = () => {

  const [conversations, setConversations] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

          /* CAR */
          const { data: car } = await supabase
            .from("cars")
            .select("title, image_url")
            .eq("id", c.car_id)
            .single();

          /* LAST MESSAGE */
          const { data: lastMsg } = await client
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          /* USER NAME (OTHER PERSON) */
          const otherUserId =
            c.buyer_id === currentUser.id ? c.seller_id : c.buyer_id;

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", otherUserId)
            .single();

          /* UNREAD COUNT */
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
      setLoading(false);
    };

    load();

  }, []);

  /* FORMAT TIME */
  const formatTime = (date: string) => {
    if (!date) return "";

    const d = new Date(date);

    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">

      <Navbar />

      <div className="max-w-4xl mx-auto p-3 sm:p-4">

        {/* HEADER */}
        <h1 className="text-xl sm:text-2xl font-bold mb-4">
          Messages
        </h1>

        {/* LOADING */}
        {loading ? (
          <p className="text-center text-gray-500">Loading chats...</p>
        ) : conversations.length === 0 ? (
          /* EMPTY STATE */
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              No conversations yet 🚀
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Start chatting from any car listing
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">

            {conversations.map((c) => {

              const isUnread = c.unread > 0;

              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/chat/${c.id}`)}
                  className={`bg-white p-3 sm:p-4 rounded-xl flex gap-3 items-center cursor-pointer transition hover:shadow ${
                    isUnread ? "border-l-4 border-blue-500" : ""
                  }`}
                >

                  {/* IMAGE */}
                  <img
                    src={c.car?.image_url || "/placeholder.png"}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover"
                  />

                  {/* CONTENT */}
                  <div className="flex-1 min-w-0">

                    {/* TOP ROW */}
                    <div className="flex justify-between items-center">

                      <p className="font-semibold truncate text-sm sm:text-base">
                        {c.profile?.username || "User"}
                      </p>

                      <p className="text-xs text-gray-400">
                        {formatTime(c.lastMsg?.created_at)}
                      </p>

                    </div>

                    {/* CAR NAME */}
                    <p className="text-xs text-gray-500 truncate">
                      {c.car?.title || "Car"}
                    </p>

                    {/* LAST MESSAGE */}
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {c.lastMsg?.message || "Start conversation"}
                    </p>

                  </div>

                  {/* UNREAD BADGE */}
                  {isUnread && (
                    <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
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