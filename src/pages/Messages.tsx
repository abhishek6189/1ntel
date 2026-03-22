import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";

const Messages = () => {

  const [conversations, setConversations] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
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

          /* 🔴 UNREAD COUNT */
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
            unread: count || 0
          };
        })
      );

      setConversations(enriched);
    };

    load();

  }, []);

  return (
    <div className="min-h-screen bg-gray-100">

      <Navbar />

      <div className="max-w-4xl mx-auto p-4">

        <h1 className="text-xl font-bold mb-4">Messages</h1>

        {conversations.length === 0 ? (
          <p className="text-gray-500">No conversations yet</p>
        ) : (
          <div className="space-y-3">

            {conversations.map((c) => (

              <div
                key={c.id}
                onClick={() => navigate(`/chat/${c.id}`)}
                className="bg-white p-3 rounded-xl flex gap-3 items-center cursor-pointer hover:bg-gray-50"
              >

                <img
                  src={c.car?.image_url}
                  className="w-14 h-14 rounded-lg object-cover"
                />

                <div className="flex-1 overflow-hidden">

                  <p className="font-semibold truncate">
                    {c.car?.title || "Car"}
                  </p>

                  <p className="text-sm text-gray-500 truncate">
                    {c.lastMsg?.message || "Start conversation"}
                  </p>

                </div>

                {/* 🔴 UNREAD BADGE */}
                {c.unread > 0 && (
                  <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {c.unread}
                  </div>
                )}

              </div>

            ))}

          </div>
        )}

      </div>

    </div>
  );
};

export default Messages;