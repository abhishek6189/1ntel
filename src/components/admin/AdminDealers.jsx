import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { Check, X, Eye, Building2, FileText } from 'lucide-react';
import { toast } from "sonner";
import moment from 'moment';
import GlobalLoader from "@/components/GlobalLoader";

export default function AdminDealers({ users = [], onRefresh }) {

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(null);

  /* ================= LOAD ================= */
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
      toast.error("Failed to load dealer request rows. Showing dealer profiles instead.");
    }

    const requestKeys = new Set(
      requests.flatMap((request) =>
        [request.user_id, request.email, request.phone].filter(Boolean)
      )
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

  /* ================= APPROVE ================= */
  const handleApprove = async (app) => {

    if (app._source !== "profile") {
      await supabase
        .from("dealer_requests")
        .update({ status: "approved" })
        .eq("id", app.id);
    }

    await supabase
      .from("profiles")
      .update({
        role: "dealer",
        dealer_status: "approved"
      })
      .eq("id", app.user_id);

    toast.success("Dealer Approved ✅");
    fetchRequests();
    onRefresh?.();
  };

  /* ================= REJECT ================= */
  const handleReject = async (app) => {

    if (!rejectionReason.trim()) {
      return toast.error("Enter rejection reason");
    }

    if (app._source !== "profile") {
      await supabase
        .from("dealer_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason
        })
        .eq("id", app.id);
    }

    await supabase
      .from("profiles")
      .update({
        dealer_status: "rejected"
      })
      .eq("id", app.user_id);

    toast.success("Rejected ❌");

    setShowReject(null);
    setRejectionReason("");

    fetchRequests();
    onRefresh?.();
  };

  /* ================= COLORS ================= */
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  /* ================= LOADING ================= */
  if (loading) {
    return <GlobalLoader className="py-10" sizeClassName="h-24 w-24" />;
  }

  return (
    <div>

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <h3 className="text-lg font-semibold">
          Dealer Requests ({applications.length})
        </h3>
      </div>

      {/* LIST */}
      {applications.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          No requests found
        </div>
      ) : (

        <div className="space-y-4">

          {applications.map(app => (

            <div
              key={app.id}
              className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition"
            >

              <div className="flex flex-col gap-4 sm:flex-row">

                {/* ICON */}
                <div className="h-12 w-12 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>

                {/* INFO */}
                <div className="flex-1 min-w-0">

                  <div className="flex flex-col gap-3 md:flex-row md:justify-between">

                    <div className="min-w-0">
                      <h4 className="font-semibold text-lg">
                        {app.full_name}
                      </h4>

                      <p className="text-sm text-muted-foreground">
                        {app.phone}
                      </p>

                      <p className="text-xs mt-1">
                        License: {app.license_number || app.dealer_license_number || "Not submitted"}
                      </p>

                      {app._source === "profile" && (
                        <p className="mt-1 text-xs text-amber-700">
                          Profile-only application
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {moment(app.created_at).format("MMM D, YYYY")}
                      </p>
                    </div>

                    <Badge className={`${statusColors[app.status]} self-start md:self-center`}>
                      {app.status}
                    </Badge>

                  </div>

                </div>

                {/* ACTIONS */}
                <div className="flex gap-2 sm:self-start">

                  <Button size="sm" variant="ghost" onClick={() => setSelected(app)}>
                    <Eye />
                  </Button>

                  {app.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 text-white"
                        onClick={() => handleApprove(app)}
                      >
                        <Check />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowReject(app)}
                      >
                        <X />
                      </Button>
                    </>
                  )}

                </div>

              </div>

            </div>

          ))}

        </div>
      )}

      {/* VIEW MODAL */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-lg">

          <DialogHeader>
            <DialogTitle>{selected?.full_name}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-3 text-sm">

              <p><b>Phone:</b> {selected.phone}</p>
              <p><b>Email:</b> {selected.email || "Not added"}</p>
              <p><b>Business:</b> {selected.business_name || "Not added"}</p>
              <p><b>License:</b> {selected.license_number || selected.dealer_license_number || "Not submitted"}</p>
              <p><b>Location:</b> {[selected.city, selected.province].filter(Boolean).join(", ") || "Not added"}</p>

              {/* DOCUMENT */}
              {selected.documents && (
                <div>

                  <p className="font-medium mb-2">Document:</p>

                  {selected.documents.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <img
                      src={selected.documents}
                      className="max-h-60 w-full rounded-lg border object-contain"
                    />
                  ) : (
                    <a
                      href={selected.documents}
                      target="_blank"
                      className="text-blue-600 flex items-center gap-2"
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

      {/* REJECT */}
      <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
        <DialogContent>

          <DialogHeader>
            <DialogTitle>Reject Reason</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Enter reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />

          <div className="flex flex-col gap-2 mt-4 sm:flex-row">
            <Button onClick={() => handleReject(showReject)}>
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
