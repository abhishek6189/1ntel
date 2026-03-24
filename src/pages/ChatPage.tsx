import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

const ChatPage = () => {

  const { id } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [car, setCar] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);

  const [online, setOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ================= LOAD ================= */
  useEffect(() => {

    let msgChannel: any;
    let presenceChannel: any;
    let currentUser: any;
    let otherUserId: string;

    const load = async () => {

      const client: any = supabase;

      const { data } = await supabase.auth.getUser();
      currentUser = data.user;
      setUser(currentUser);

      const { data: convo } = await client
        .from("chat_conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (!convo || !currentUser) return;

      otherUserId =
        convo.buyer_id === currentUser.id
          ? convo.seller_id
          : convo.buyer_id;

      /* MARK READ */
      await client
        .from("chat_messages")
        .update({ is_read: true })
        .eq("conversation_id", id)
        .neq("sender_id", currentUser.id)
        .eq("is_read", false);

      /* ONLINE */
      await client.from("chat_presence").upsert({
        user_id: currentUser.id,
        is_online: true
      });

      /* CAR */
      const { data: carData } = await supabase
        .from("cars")
        .select("title, image_url")
        .eq("id", convo.car_id)
        .single();

      setCar(carData);

      /* USER */
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", otherUserId)
        .single();

      setOtherUser(profile);

      /* LOAD MESSAGES */
      const { data: msgs } = await client
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
      setLoading(false);

      /* REALTIME MESSAGES */
      msgChannel = supabase
        .channel(`chat-${id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `conversation_id=eq.${id}`
          },
          async (payload) => {

            setMessages((prev) => {
              const exists = prev.some((m) => m.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
            });

            if (payload.new.sender_id !== currentUser.id) {
              await client
                .from("chat_messages")
                .update({ is_read: true })
                .eq("id", payload.new.id);
            }
          }
        )
        .subscribe();

      /* PRESENCE */
      presenceChannel = supabase
        .channel("presence")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_presence"
          },
          (payload) => {
            if (payload.new.user_id === otherUserId) {
              setOnline(payload.new.is_online);
              setOtherTyping(payload.new.typing_in === id);
            }
          }
        )
        .subscribe();
    };

    load();

    return () => {
      if (msgChannel) supabase.removeChannel(msgChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);

      if (user) {
        (supabase as any).from("chat_presence").upsert({
          user_id: user.id,
          is_online: false
        });
      }
    };

  }, [id]);

  /* AUTO SCROLL */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* SEND MESSAGE */
  const sendMessage = async () => {

    if (!input.trim() || !user) return;

    const text = input;
    setInput("");

    await (supabase as any)
      .from("chat_messages")
      .insert({
        conversation_id: id,
        sender_id: user.id,
        message: text,
        is_read: false
      });

    await (supabase as any)
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);
  };

  /* FILE UPLOAD */
  const handleFileUpload = async (file: File) => {

    const filePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file);

    if (error) return alert(error.message);

    const { data } = supabase.storage
      .from("chat-files")
      .getPublicUrl(filePath);

    await (supabase as any)
      .from("chat_messages")
      .insert({
        conversation_id: id,
        sender_id: user.id,
        message: file.name,
        file_url: data.publicUrl,
        file_type: file.type,
        is_read: false
      });
  };

  /* DELETE */
  const deleteMessage = async (msgId: string) => {
    await (supabase as any)
      .from("chat_messages")
      .update({ is_deleted: true })
      .eq("id", msgId);
  };

  /* TYPING */
  const handleTyping = async (value: string) => {
    setInput(value);

    await (supabase as any)
      .from("chat_presence")
      .upsert({
        user_id: user.id,
        typing_in: id
      });

    setTimeout(async () => {
      await (supabase as any)
        .from("chat_presence")
        .upsert({
          user_id: user.id,
          typing_in: null
        });
    }, 1500);
  };

  /* TIME */
  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      <Navbar />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">

        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b p-3 flex items-center gap-3">

          <button onClick={() => navigate(-1)}>
            <ArrowLeft />
          </button>

          <img src={car?.image_url} className="w-10 h-10 rounded" />

          <div>
            <p className="font-semibold">{otherUser?.username}</p>
            <p className="text-xs text-gray-500">
              {otherTyping ? (
                <span className="flex gap-1">
                  typing
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </span>
              ) : online ? "Online" : "Offline"}
            </p>
          </div>

        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">

          {messages.map((msg) => {

            const isMe = msg.sender_id === user?.id;

            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>

                <div className={`px-4 py-2 rounded-xl max-w-[75%] hover:scale-[1.02] transition ${
                  isMe
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "bg-white shadow-sm border"
                }`}>

                  {msg.file_url ? (
                    msg.file_type?.startsWith("image") ? (
                      <img
                        src={msg.file_url}
                        onClick={() => setPreviewImage(msg.file_url)}
                        className="rounded-lg max-w-[200px] cursor-pointer"
                      />
                    ) : (
                      <a href={msg.file_url} target="_blank" className="underline">
                        {msg.message}
                      </a>
                    )
                  ) : msg.is_deleted ? (
                    <p className="italic text-gray-400">Message deleted</p>
                  ) : (
                    <p>{msg.message}</p>
                  )}

                  {!msg.is_deleted && isMe && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="text-[10px] text-red-200 mt-1"
                    >
                      Delete
                    </button>
                  )}

                  <p className="text-[10px] mt-1 flex justify-end gap-1">
                    {formatTime(msg.created_at)}
                    {isMe && (msg.is_read ? "✓✓" : "✓")}
                  </p>

                </div>

              </div>
            );
          })}

          <div ref={bottomRef} />

        </div>

        {/* INPUT */}
        <div className="p-3 bg-white border-t flex gap-2">

          <label className="cursor-pointer">📎
            <input
              type="file"
              hidden
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </label>

          <input
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2"
          />

          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 rounded-full"
          >
            Send
          </button>

        </div>

      </div>

      {/* IMAGE PREVIEW */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} className="max-w-[90%] max-h-[90%]" />
        </div>
      )}

    </div>
  );
};

export default ChatPage;