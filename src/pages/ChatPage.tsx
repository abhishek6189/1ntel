import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Check, CheckCheck } from "lucide-react";

const ChatPage = () => {

  const { id } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<any>(null);

  const [otherUser, setOtherUser] = useState<any>(null);

  const [online, setOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* ================= LOAD ================= */
  useEffect(() => {

    let msgChannel: any;
    let presenceChannel: any;

    const load = async () => {

      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUser(currentUser);

      if (!currentUser) return;

      const { data: convo } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (!convo) return;

      const otherUserId =
        convo.buyer_id === currentUser.id
          ? convo.seller_id
          : convo.buyer_id;

      /* ✅ CORRECT PROFILE FETCH (FINAL FIX) */
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", otherUserId)
        .maybeSingle();

      setOtherUser({
        username: profile?.username || "User",
        avatar_url: profile?.avatar_url || null
      });

      /* LOAD MESSAGES */
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);

      /* REALTIME */
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
          (payload) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
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
    };

  }, [id]);

  /* AUTO SCROLL */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* AUTO FOCUS */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* SEND TEXT */
  const sendMessage = async () => {

    if (!input.trim() || !user) return;

    setSending(true);

    const text = input;
    setInput("");

    await supabase.from("chat_messages").insert({
      conversation_id: id,
      sender_id: user.id,
      message: text,
      is_read: false
    });

    setSending(false);
  };

  /* SEND FILE */
  const sendFile = async () => {

    if (!previewFile || !user) return;

    try {
      setSending(true);

      const filePath = `${user.id}/${Date.now()}-${previewFile.name}`;

      const { error } = await supabase.storage
        .from("chat-files")
        .upload(filePath, previewFile);

      if (error) throw error;

      const { data } = supabase.storage
        .from("chat-files")
        .getPublicUrl(filePath);

      await supabase.from("chat_messages").insert({
        conversation_id: id,
        sender_id: user.id,
        message: previewFile.name,
        file_url: data.publicUrl,
        file_type: previewFile.type,
        is_read: false
      });

      setPreviewFile(null);
      setPreviewUrl(null);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  /* FILE SELECT */
  const handleFileSelect = (file: File) => {
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      <Navbar />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">

        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">

          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <span className="font-semibold">
                {otherUser?.username?.charAt(0)}
              </span>
            )}
          </div>

          <div>
            <p className="font-semibold">{otherUser?.username}</p>
            <p className="text-xs text-gray-500">
              {otherTyping ? "Typing..." : online ? "Online" : "Offline"}
            </p>
          </div>

        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {messages.map((msg) => {

            const isMe = msg.sender_id === user?.id;

            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>

                <div className={`px-4 py-2 rounded-2xl max-w-[70%] break-words ${
                  isMe
                    ? "bg-blue-600 text-white"
                    : "bg-white border"
                }`}>

                  {msg.file_url ? (
                    <img src={msg.file_url} className="rounded-lg max-w-[220px]" />
                  ) : (
                    <p>{msg.message}</p>
                  )}

                  <div className="flex justify-end items-center gap-1 text-xs mt-1">

                    <span>{formatTime(msg.created_at)}</span>

                    {isMe && (
                      msg.is_read
                        ? <CheckCheck className="w-4 h-4 text-blue-300" />
                        : <Check className="w-4 h-4 text-gray-300" />
                    )}

                  </div>

                </div>

              </div>
            );
          })}

          <div ref={bottomRef} />

        </div>

        {/* PREVIEW */}
        {previewUrl && (
          <div className="p-3 bg-white border-t flex items-center gap-3">
            <img src={previewUrl} className="w-16 h-16 rounded object-cover" />
            <button
              onClick={sendFile}
              disabled={sending}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        )}

        {/* INPUT */}
        <div className="p-3 bg-white border-t flex gap-2">

          <label className="cursor-pointer px-2 flex items-center">
            📎
            <input
              type="file"
              hidden
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </label>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2"
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="bg-blue-600 text-white px-4 rounded-full disabled:opacity-50"
          >
            Send
          </button>

        </div>

      </div>

    </div>
  );
};

export default ChatPage;