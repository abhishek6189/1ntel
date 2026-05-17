import { useState } from "react";
import { Mail, Phone, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AdminContactMessages({ messages = [], onRefresh }) {
  const [busyId, setBusyId] = useState("");

  const markHandled = async (id) => {
    setBusyId(id);

    const { error } = await supabase
      .from("contact_messages")
      .update({ status: "handled", handled_at: new Date().toISOString() })
      .eq("id", id);

    setBusyId("");

    if (error) {
      toast.error(error.message || "Could not update message");
      return;
    }

    toast.success("Message marked as handled");
    onRefresh?.();
  };

  const sorted = [...messages].sort((a, b) => {
    if ((a.status || "new") !== (b.status || "new")) {
      return (a.status || "new") === "new" ? -1 : 1;
    }

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Contact Messages</h3>
          <p className="text-sm text-muted-foreground">
            Messages submitted from the public Contact page.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {sorted.filter((message) => (message.status || "new") === "new").length} new
        </Badge>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No contact messages yet
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((message) => {
            const isHandled = message.status === "handled";

            return (
              <div
                key={message.id}
                className="rounded-xl border bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{message.name || "No name"}</h4>
                      <Badge
                        className={
                          isHandled
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }
                      >
                        {isHandled ? "Handled" : "New"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <a
                        href={`mailto:${message.email}`}
                        className="inline-flex items-center gap-1 hover:text-blue-600"
                      >
                        <Mail className="h-4 w-4" />
                        {message.email || "No email"}
                      </a>

                      {message.phone && (
                        <a
                          href={`tel:${message.phone}`}
                          className="inline-flex items-center gap-1 hover:text-blue-600"
                        >
                          <Phone className="h-4 w-4" />
                          {message.phone}
                        </a>
                      )}
                    </div>

                    <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                      {message.message}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {message.created_at
                        ? new Date(message.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>

                  {!isHandled && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === message.id}
                      onClick={() => markHandled(message.id)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {busyId === message.id ? "Saving..." : "Mark handled"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
