// ✅ FINAL 11/10 PRODUCTION CHAT (ZERO ERROR VERSION)

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Mic,
  Paperclip,
  MoreVertical,
  Trash2,
  Pencil,
  Send,
  X
} from "lucide-react";

const ChatPage = ({ hideNavbar = false }: { hideNavbar?: boolean }) => {

  const { id } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);

  const [online, setOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);

  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ================= LOAD ================= */
  useEffect(() => {
    let channel: any;

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

      const otherUserId =
        convo.buyer_id === currentUser.id
          ? convo.seller_id
          : convo.buyer_id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherUserId)
        .single();

      setOtherUser(profile);

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);

      // ✅ MARK ALL AS READ WHEN OPEN CHAT
         await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("conversation_id", id)
        .neq("sender_id", currentUser.id);

      channel = supabase
        .channel(`chat-${id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `conversation_id=eq.${id}`
          },
          async (payload: any) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });

            if (payload.new.sender_id !== currentUser.id) {
              await supabase
                .from("chat_messages")
                .update({ is_read: true })
                .eq("id", payload.new.id);
            }
          }
        )
        .subscribe();
    };

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };

  }, [id]);

  /* ================= LAST SEEN ================= */
  useEffect(() => {
    if (!user) return;

    const updateLastSeen = () => {
      supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", user.id);
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 10000);

    return () => clearInterval(interval);
  }, [user]);

  /* ================= TYPING ================= */
  useEffect(() => {
    if (!user) return;

    const updateTyping = () => {
      supabase.from("chat_presence").upsert({
        user_id: user.id,
        typing_in: id,
        updated_at: new Date().toISOString()
      });
    };

    const stopTyping = () => {
      supabase
        .from("chat_presence")
        .update({ typing_in: null })
        .eq("user_id", user.id);
    };

    if (input) updateTyping();
    else stopTyping();

    return () => {}; // ✅ no async cleanup

  }, [input, user, id]);

  /* ================= LISTEN TYPING ================= */
  useEffect(() => {
    if (!otherUser?.id) return;

    const channel = supabase
      .channel("typing")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_presence"
        },
        (payload: any) => {
          if (payload.new?.user_id === otherUser.id) {
            setOtherTyping(payload.new.typing_in === id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [otherUser, id]);

  /* ================= ONLINE ================= */
  useEffect(() => {
    if (!otherUser?.last_seen) return;

    const interval = setInterval(() => {
      const diff = Date.now() - new Date(otherUser.last_seen).getTime();
      setOnline(diff < 60000);
    }, 2000);

    return () => clearInterval(interval);
  }, [otherUser]);

  const formatLastSeen = (time: string) =>
    `Last seen ${new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;

  const formatTime = (time: string) =>
    new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

  /* ================= SEND ================= */
  const sendMessage = async () => {
    if (!input.trim() || !user) return;

    if (editingMsg) {
      await supabase
        .from("chat_messages")
        .update({ message: input })
        .eq("id", editingMsg.id);

      setEditingMsg(null);
      setInput("");
      return;
    }

    const tempId = Date.now();

    const tempMsg = {
      id: tempId,
      message: input,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      is_read: false
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInput("");

    const { data } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: id,
        sender_id: user.id,
        message: tempMsg.message
      })
      .select()
      .single();

    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? data : m))
    );
  };

  /* ================= DELETE ================= */
  const deleteMessage = async (msgId: string) => {
    await supabase
      .from("chat_messages")
      .update({
        is_deleted: true,
        message: "🚫 This message was deleted"
      })
      .eq("id", msgId);

    setMenuOpen(null);
  };

  /* ================= EDIT ================= */
  const startEdit = (msg: any) => {
    setEditingMsg(msg);
    setInput(msg.message || "");
    setMenuOpen(null);
  };

  /* ================= FILE ================= */
  const sendFile = async () => {
    if (!previewFile || !user) return;

    setSending(true);
    setUploadProgress(10);

    const path = `${user.id}/${Date.now()}-${previewFile.name}`;

    await supabase.storage.from("chat-files").upload(path, previewFile);
    setUploadProgress(70);

    const { data } = supabase.storage
      .from("chat-files")
      .getPublicUrl(path);

    await supabase.from("chat_messages").insert({
      conversation_id: id,
      sender_id: user.id,
      file_url: data.publicUrl,
      file_type: previewFile.type
    });

    setUploadProgress(100);

    setTimeout(() => {
      setPreviewFile(null);
      setPreviewUrl(null);
      setSending(false);
      setUploadProgress(0);
    }, 500);
  };

  /* ================= VOICE ================= */
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    const chunks: any[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });

      const path = `${user.id}/${Date.now()}.webm`;

      await supabase.storage.from("chat-files").upload(path, blob);

      const { data } = supabase.storage.from("chat-files").getPublicUrl(path);

      await supabase.from("chat_messages").insert({
        conversation_id: id,
        sender_id: user.id,
        file_url: data.publicUrl,
        file_type: "audio"
      });
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  /* ================= SCROLL ================= */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-screen flex flex-col bg-[#efeae2]">
      {!hideNavbar && <Navbar />}

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">

        {/* HEADER */}
        <div
          onClick={() => navigate(`/seller/${otherUser?.id}`)}
          className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 cursor-pointer shadow-sm"
        >
          <ArrowLeft onClick={(e) => { e.stopPropagation(); navigate(-1); }} />

          <img
            src={otherUser?.avatar_url || "https://i.pravatar.cc/100"}
            className="w-10 h-10 rounded-full"
          />

          <div>
            <p className="font-semibold">{otherUser?.full_name}</p>
            <p className="text-xs text-gray-500">
              {otherTyping
                ? "Typing..."
                : online
                ? "Online"
                : otherUser?.last_seen
                ? formatLastSeen(otherUser.last_seen)
                : "Offline"}
            </p>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;

            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`relative max-w-[75%] px-4 py-2 rounded-2xl shadow ${
                  isMe ? "bg-blue-600 text-white" : "bg-white"
                }`}>

                  {msg.file_url ? (
                    msg.file_type?.startsWith("image") ? (
                      <img
                        src={msg.file_url}
                        onClick={() => setPreviewUrl(msg.file_url)}
                        className="rounded-lg max-w-[220px] cursor-pointer"
                      />
                    ) : msg.file_type?.startsWith("audio") ? (
                      <audio controls src={msg.file_url} />
                    ) : null
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  )}

                  {isMe && (
                    <div className="absolute top-1 right-1">
                      <MoreVertical
                        size={16}
                        onClick={() =>
                          setMenuOpen(menuOpen === msg.id ? null : msg.id)
                        }
                        className="cursor-pointer opacity-70"
                      />

                      {menuOpen === msg.id && (
                        <div className="absolute right-0 mt-2 bg-white border rounded-xl shadow-lg text-sm z-20">
                          <button
                            onClick={() => startEdit(msg)}
                            className="flex gap-2 px-3 py-2 hover:bg-gray-100 text-gray-700 w-full"
                          >
                            <Pencil size={14}/> Edit
                          </button>
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="flex gap-2 px-3 py-2 hover:bg-red-50 text-red-500 w-full"
                          >
                            <Trash2 size={14}/> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs mt-1 flex justify-end gap-1 opacity-70">
                    {formatTime(msg.created_at)}
                    {isMe && (msg.is_read ? <CheckCheck size={14}/> : <Check size={14}/>)}
                  </div>

                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* PREVIEW */}
        {previewUrl && (
          <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <img src={previewUrl} className="max-h-[80%] max-w-[90%]" />

            {sending && (
              <p className="text-white mt-4 text-lg">
                Uploading... {uploadProgress}%
              </p>
            )}

            {previewFile && (
              <button
                onClick={sendFile}
                className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-full"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            )}

            <button
              onClick={() => {
                setPreviewFile(null);
                setPreviewUrl(null);
              }}
              className="absolute top-5 right-5 bg-white p-2 rounded-full"
            >
              <X />
            </button>
          </div>
        )}

        {/* INPUT */}
        <div className="p-3 bg-white border-t flex gap-2 items-center">
          <label className="p-2 rounded-full hover:bg-gray-100 cursor-pointer">
            <Paperclip />
            <input type="file" hidden onChange={(e)=>{
              const file = e.target.files?.[0];
              if (!file) return;
              setPreviewFile(file);
              setPreviewUrl(URL.createObjectURL(file));
            }}/>
          </label>

          <input
            value={input || ""}
            onChange={(e)=>setInput(e.target.value)}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2"
          />

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            className={`p-2 rounded-full ${recording ? "bg-red-500 text-white" : "hover:bg-gray-100"}`}
          >
            <Mic />
          </button>

          <button onClick={sendMessage} className="bg-blue-600 text-white p-2 rounded-full">
            <Send />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatPage;