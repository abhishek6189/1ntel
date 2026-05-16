import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminInspections({ inspections = [], onRefresh }) {
  const updateInspectionStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from("inspection_requests")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) return null;

    const { error: legacyError } = await supabase
      .from("inspections")
      .update({ status: newStatus })
      .eq("id", id);

    return legacyError || error;
  };

  const handleStatusChange = async (id, newStatus) => {
    const error = await updateInspectionStatus(id, newStatus);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (newStatus === "completed") {
      const insp = inspections.find((item) => item.id === id);

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

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-yellow-100 text-yellow-800",
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
            <div key={insp.id} className="bg-card rounded-xl border p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div className="min-w-0">
                  <h4 className="font-semibold">
                    {insp.car_title || "Unknown Car"}
                  </h4>

                  <p className="text-sm text-muted-foreground mt-1">
                    Buyer: {insp.requester_email || "No email"}
                    {insp.requester_phone ? ` | ${insp.requester_phone}` : ""}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Seller: {insp.seller_email || "No email"}
                    {insp.seller_phone ? ` | ${insp.seller_phone}` : ""}
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    {insp.created_at
                      ? new Date(insp.created_at).toLocaleString()
                      : ""}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
                  <Badge
                    className={`capitalize text-xs ${
                      statusColors[insp.status] || statusColors.pending
                    }`}
                  >
                    {(insp.status || "pending").replace("_", " ")}
                  </Badge>

                  <div className="flex flex-wrap gap-1">
                    {["pending", "paid", undefined, null].includes(insp.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(insp.id, "in_progress")}
                      >
                        Start
                      </Button>
                    )}

                    {insp.status === "in_progress" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusChange(insp.id, "completed")}
                      >
                        Complete
                      </Button>
                    )}

                    {["pending", "paid", "in_progress", undefined, null].includes(insp.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handleStatusChange(insp.id, "cancelled")}
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
