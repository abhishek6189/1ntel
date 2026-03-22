import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

const ChatPage = () => {

  const { id } = useParams();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [car, setCar] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

 useEffect(() => {

  const load = async () => {

    const client: any = supabase;

    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;
    setUser(currentUser);

    const { data: convo } = await client
      .from("chat_conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (!convo) return;

    /* MARK AS READ */
    await client
      .from("chat_messages")
      .update({ is_read: true })
      .eq("conversation_id", id)
      .neq("sender_id", currentUser?.id);

    /* CAR */
    if (convo.car_id) {
      const { data: carData } = await supabase
        .from("cars")
        .select("title, image_url")
        .eq("id", convo.car_id)
        .single();

      setCar(carData);
    }

    /* SELLER */
    if (convo.seller_id) {
      const { data: sellerData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", convo.seller_id)
        .single();

      setSeller(sellerData);
    }

    /* MESSAGES */
    const { data: msgs } = await client
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    setMessages(msgs || []);
    setLoading(false);
  };

  load();

  const channel = supabase
    .channel(`chat-${id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${id}`
      },
      (payload) => {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === payload.new.id);
          if (exists) return prev;
          return [...prev, payload.new];
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };

}, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {

    if (!input.trim() || !user) return;

    const text = input;
    setInput("");
    setSending(true);

    const tempId = "temp-" + Date.now();

    const tempMessage = {
      id: tempId,
      message: text,
      sender_id: user.id,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMessage]);

    const { data, error } = await (supabase as any)
      .from("chat_messages")
      .insert({
        conversation_id: id,
        sender_id: user.id,
        message: text,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
    }

    /* UPDATE CONVO */
    await (supabase as any)
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">

        {/* HEADER */}
        <div className="p-3 bg-white border-b flex gap-3">
          <img src={car?.image_url} className="w-12 h-12 rounded" />
          <div>
            <p className="font-semibold">{car?.title}</p>
            <p className="text-sm text-gray-500">{seller?.full_name}</p>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender_id === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div className="bg-white px-3 py-2 rounded-xl max-w-[70%]">
                {msg.message}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="p-3 bg-white border-t flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded">
            Send
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatPage;