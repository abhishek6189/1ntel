import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Check, Eye, FileText, Store, X } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import GlobalLoader from "@/components/GlobalLoader";
import { getFunctionErrorMessage } from "@/utils/functionErrors";

const statusColors = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function AdminDealers({ users = [], onRefresh }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(null);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [users]);

  const fetchRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("dealer_requests")
      .select("*")
      .order("created_at", { ascending: false });

    const requests = error ? [] : data || [];

    if (error) {
      toast.error("Could not load dealer request rows. Showing dealer profiles instead.");
    }

    const requestKeys = new Set(
      requests.flatMap((request) => [request.user_id, request.email, request.phone].filter(Boolean))
    );

    const fallbackProfiles = users
      .filter((user) => {
        if (user.deleted_at) return false;
        const role = String(user.role || "").toLowerCase();
        const dealerStatus = String(user.dealer_status || "").toLowerCase();
        return role === "dealer" || ["pending", "approved", "rejected"].includes(dealerStatus);
      })
      .filter(
        (user) =>
          !requestKeys.has(user.id) &&
          !requestKeys.has(user.email) &&
          !requestKeys.has(user.phone)
      )
      .map((user) => ({
        id: `profile-${user.id}`,
        user_id: user.id,
        email: user.email,
        full_name: user.full_name || user.business_name || "Dealer applicant",
        business_name: user.business_name,
        phone: user.phone,
        license_number: user.license_number || user.dealer_license_number || "Not submitted",
        dealer_license_number: user.dealer_license_number || user.license_number,
        city: user.city,
        province: user.province,
        documents: user.documents || user.license_document_url,
        status: user.dealer_status || "pending",
        created_at: user.created_at,
        _source: "profile",
      }));

    setApplications([...requests, ...fallbackProfiles]);
    setLoading(false);
  };

  const runDealerAction = async ({ app, action, rejectionReason: reason }) => {
    setBusyId(app.id);
    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: {
        action,
        userId: app.user_id,
        requestId: app.id,
        rejectionReason: reason,
      },
    });
    setBusyId("");

    if (error) {
      toast.error(await getFunctionErrorMessage(error, "Dealer action failed"));
      return false;
    }

    if (data?.error) {
      toast.error(data.error);
      return false;
    }

    toast.success(action === "approve_dealer" ? "Dealer approved" : "Dealer rejected");
    fetchRequests();
    onRefresh?.();
    return true;
  };

  const handleApprove = (app) => runDealerAction({ app, action: "approve_dealer" });

  const handleReject = async (app) => {
    if (!rejectionReason.trim()) {
      toast.error("Enter rejection reason");
      return;
    }

    const ok = await runDealerAction({
      app,
      action: "reject_dealer",
      rejectionReason,
    });

    if (ok) {
      setShowReject(null);
      setRejectionReason("");
    }
  };

  if (loading) {
    return <GlobalLoader className="py-10" sizeClassName="h-24 w-24" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Dealer requests</h3>
          <p className="text-sm text-slate-500">{applications.length} applications found</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-xl border bg-white py-10 text-center text-sm text-slate-500">
          No requests found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {applications.map((app) => (
            <div key={app.id} className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Store className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-slate-950">
                        {app.full_name || app.business_name || "Dealer applicant"}
                      </h4>
                      <p className="truncate text-xs text-slate-500">{app.email || app.phone || "No contact"}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        License: {app.license_number || app.dealer_license_number || "Not submitted"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {app.created_at ? moment(app.created_at).format("MMM D, YYYY h:mm A") : "-"}
                      </p>
                      {app._source === "profile" && (
                        <p className="mt-1 text-xs text-amber-700">Profile-only application</p>
                      )}
                    </div>

                    <Badge className={`${statusColors[app.status] || statusColors.pending} w-fit`}>
                      {app.status || "pending"}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 sm:self-start">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(app)}>
                    <Eye className="h-4 w-4" />
                  </Button>

                  {String(app.status || "pending").toLowerCase() === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => handleApprove(app)}
                        disabled={busyId === app.id}
                      >
                        <Check className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowReject(app)}
                        disabled={busyId === app.id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.full_name || selected?.business_name || "Dealer applicant"}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-3 text-sm">
              <p><b>Phone:</b> {selected.phone || "Not added"}</p>
              <p><b>Email:</b> {selected.email || "Not added"}</p>
              <p><b>Business:</b> {selected.business_name || "Not added"}</p>
              <p><b>License:</b> {selected.license_number || selected.dealer_license_number || "Not submitted"}</p>
              <p><b>Location:</b> {[selected.city, selected.province].filter(Boolean).join(", ") || "Not added"}</p>

              {selected.documents && (
                <div>
                  <p className="mb-2 font-medium">Document:</p>
                  {String(selected.documents).match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <img
                      src={selected.documents}
                      className="max-h-60 w-full rounded-lg border object-contain"
                    />
                  ) : (
                    <a
                      href={selected.documents}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-blue-600"
                    >
                      <FileText size={16} /> View Document
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject dealer request</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Enter rejection reason"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
          />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => handleReject(showReject)} disabled={busyId === showReject?.id}>
              Reject
            </Button>
            <Button variant="ghost" onClick={() => setShowReject(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
