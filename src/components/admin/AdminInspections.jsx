import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminInspections({ inspections, onRefresh }) {

  /* 🔥 STATUS UPDATE */
  const handleStatusChange = async (id, newStatus) => {

    // 1️⃣ Update inspection status
    const { error } = await supabase
      .from("inspections")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    // 2️⃣ If completed → update car inspection status
    if (newStatus === "completed") {
      const insp = inspections.find((i) => i.id === id);

      if (insp?.car_id) {
        await supabase
          .from("cars")
          .update({ inspection_status: "passed" })
          .eq("id", insp.car_id);
      }
    }

    toast.success("Inspection status updated");
    onRefresh();
  };

  /* 🎨 STATUS COLORS */
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-4">
        Inspection Requests
      </h3>

      {inspections.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 text-center text-muted-foreground">
          No inspection requests yet
        </div>
      ) : (
        <div className="space-y-3">
          {inspections.map((insp) => (
            <div
              key={insp.id}
              className="bg-card rounded-xl border p-4"
            >
              <div className="flex flex-col lg:flex-row lg:justify-between gap-4">

                {/* LEFT INFO */}
                <div className="min-w-0">
                  <h4 className="font-semibold">
                    {insp.car_title || "Unknown Car"}
                  </h4>

                  <p className="text-sm text-muted-foreground mt-1">
                    Requested by: {insp.requester_email}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Seller: {insp.seller_email}
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    {insp.created_at
                      ? new Date(insp.created_at).toLocaleString()
                      : ""}
                  </p>
                </div>

                {/* RIGHT ACTIONS */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">

                  <Badge
                    className={`capitalize text-xs ${
                      statusColors[insp.status] || statusColors.pending
                    }`}
                  >
                    {insp.status?.replace("_", " ")}
                  </Badge>

                  <div className="flex flex-wrap gap-1">

                    {insp.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(insp.id, "in_progress")
                        }
                      >
                        Start
                      </Button>
                    )}

                    {insp.status === "in_progress" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          handleStatusChange(insp.id, "completed")
                        }
                      >
                        Complete
                      </Button>
                    )}

                    {(insp.status === "pending" ||
                      insp.status === "in_progress") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() =>
                          handleStatusChange(insp.id, "cancelled")
                        }
                      >
                        Cancel
                      </Button>
                    )}

                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
