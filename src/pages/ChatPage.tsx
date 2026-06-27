import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { FALLBACK_AVATAR_URL } from "@/utils/imageFiles";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
  X,
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

  const bottomRef = useRef<HTMLDivElement | null>(null);

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
        convo.buyer_id === currentUser.id ? convo.seller_id : convo.buyer_id;

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
            filter: `conversation_id=eq.${id}`,
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

  useEffect(() => {
    if (!user) return;

    const updateTyping = () => {
      supabase.from("chat_presence").upsert({
        user_id: user.id,
        typing_in: id,
        updated_at: new Date().toISOString(),
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
  }, [input, user, id]);

  useEffect(() => {
    if (!otherUser?.id) return;

    const channel = supabase
      .channel("typing")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_presence",
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

  useEffect(() => {
    if (!otherUser?.last_seen) return;

    const interval = setInterval(() => {
      const diff = Date.now() - new Date(otherUser.last_seen).getTime();
      setOnline(diff < 60000);
    }, 2000);

    return () => clearInterval(interval);
  }, [otherUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (time: string) =>
    new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const sendMessage = async () => {
    if (!input.trim() || !user) return;

    if (editingMsg) {
      await supabase
        .from("chat_messages")
        .update({ message: input.trim() })
        .eq("id", editingMsg.id);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMsg.id ? { ...msg, message: input.trim() } : msg
        )
      );
      setEditingMsg(null);
      setInput("");
      return;
    }

    const tempId = Date.now();
    const tempMsg = {
      id: tempId,
      message: input.trim(),
      sender_id: user.id,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInput("");

    const { data } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: id,
        sender_id: user.id,
        message: tempMsg.message,
      })
      .select()
      .single();

    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? data : m))
    );
  };

  const deleteMessage = async (msgId: string) => {
    await supabase
      .from("chat_messages")
      .update({
        is_deleted: true,
        message: "This message was deleted",
      })
      .eq("id", msgId);

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId
          ? { ...msg, is_deleted: true, message: "This message was deleted" }
          : msg
      )
    );
    setMenuOpen(null);
  };

  const startEdit = (msg: any) => {
    setEditingMsg(msg);
    setInput(msg.message || msg.content || "");
    setMenuOpen(null);
  };

  return (
    <div className={`${hideNavbar ? "h-full" : "min-h-screen"} flex flex-col overflow-x-hidden bg-slate-100`}>
      {!hideNavbar && <Navbar />}

      <div className={`${hideNavbar ? "h-full" : "flex-1 px-3 py-4 sm:px-5 sm:py-6"} flex min-h-0 w-full overflow-x-hidden`}>
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-col overflow-hidden border bg-white shadow-none sm:rounded-2xl sm:shadow-xl">
          <div
            onClick={() => otherUser?.id && navigate(`/seller/${otherUser.id}`)}
            className="sticky top-0 z-20 flex cursor-pointer items-center gap-3 border-b bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:px-5"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="relative shrink-0">
              <img
                src={otherUser?.avatar_url || FALLBACK_AVATAR_URL}
                className="h-11 w-11 rounded-full border border-slate-200 object-cover"
              />
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                  online ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-slate-950">
                {otherUser?.full_name || otherUser?.username || "User"}
              </p>
              <p className="truncate text-xs font-medium text-slate-500">
                {otherTyping ? "Typing..." : online ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(0,53,122,0.08),transparent_26rem),linear-gradient(180deg,#f8fafc,#eef2f7)] p-3 sm:p-5">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[24rem] items-center justify-center">
                <div className="max-w-xs text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#00357a] shadow-sm">
                    <MessageCircle className="h-7 w-7" />
                  </div>
                  <p className="font-semibold text-slate-950">Start the conversation</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Send a clear message about the vehicle, availability, or next steps.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;

                  return (
                    <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`group relative max-w-[min(84vw,34rem)] px-3.5 py-2.5 shadow-sm ring-1 sm:max-w-[72%] sm:px-4 ${
                          isMe
                            ? "rounded-2xl rounded-br-md bg-blue-600 text-white ring-blue-500/20"
                            : "rounded-2xl rounded-bl-md bg-white text-slate-900 ring-slate-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words pr-4 text-sm leading-relaxed [overflow-wrap:anywhere] sm:text-base">
                          {msg.message || msg.content || "Attachment removed"}
                        </p>

                        {isMe && (
                          <div className="absolute right-1.5 top-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setMenuOpen(menuOpen === msg.id ? null : msg.id)
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 data-[open=true]:opacity-100"
                              data-open={menuOpen === msg.id}
                              aria-label="Message options"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {menuOpen === msg.id && (
                              <div className="absolute right-0 z-30 mt-2 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl">
                                <button
                                  onClick={() => startEdit(msg)}
                                  className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil size={14} /> Edit
                                </button>
                                <button
                                  onClick={() => deleteMessage(msg.id)}
                                  className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className={`mt-1.5 flex items-center justify-end gap-1 text-[11px] ${
                          isMe ? "text-white/75" : "text-slate-400"
                        }`}>
                          {formatTime(msg.created_at)}
                          {isMe && (msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t bg-white p-3 sm:p-4">
            {editingMsg && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                <span className="truncate">Editing message</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMsg(null);
                    setInput("");
                  }}
                  className="ml-3 rounded-full p-1 hover:bg-blue-100"
                  aria-label="Cancel edit"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
              <textarea
                value={input || ""}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder="Type your message..."
                className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-base text-slate-950 outline-none placeholder:text-slate-400"
              />

              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
