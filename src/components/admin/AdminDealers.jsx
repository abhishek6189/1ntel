import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { Check, X, Eye, Building2, FileText } from 'lucide-react';
import { toast } from "sonner";
import moment from 'moment';

export default function AdminDealers() {

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(null);

  /* ================= LOAD ================= */
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("dealer_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load requests");
    } else {
      setApplications(data || []);
    }

    setLoading(false);
  };

  /* ================= APPROVE ================= */
  const handleApprove = async (app) => {

    // 1. update request table
    await supabase
      .from("dealer_requests")
      .update({ status: "approved" })
      .eq("id", app.id);

    // 2. update profile (VERY IMPORTANT)
    await supabase
      .from("profiles")
      .update({
        role: "dealer",
        dealer_status: "approved"
      })
      .eq("id", app.user_id);

    toast.success("Dealer Approved ✅");
    fetchRequests();
  };

  /* ================= REJECT ================= */
  const handleReject = async (app) => {

    if (!rejectionReason.trim()) {
      return toast.error("Enter rejection reason");
    }

    await supabase
      .from("dealer_requests")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason
      })
      .eq("id", app.id);

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
  };

  /* ================= COLORS ================= */
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
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

              <div className="flex gap-4">

                {/* ICON */}
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>

                {/* INFO */}
                <div className="flex-1">

                  <div className="flex justify-between">

                    <div>
                      <h4 className="font-semibold text-lg">
                        {app.full_name}
                      </h4>

                      <p className="text-sm text-muted-foreground">
                        {app.phone}
                      </p>

                      <p className="text-xs mt-1">
                        License: {app.license_number}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {moment(app.created_at).format("MMM D, YYYY")}
                      </p>
                    </div>

                    <Badge className={statusColors[app.status]}>
                      {app.status}
                    </Badge>

                  </div>

                </div>

                {/* ACTIONS */}
                <div className="flex gap-2">

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
        <DialogContent className="max-w-lg">

          <DialogHeader>
            <DialogTitle>{selected?.full_name}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-3 text-sm">

              <p><b>Phone:</b> {selected.phone}</p>
              <p><b>License:</b> {selected.license_number}</p>

              {/* DOCUMENT */}
              {selected.documents && (
                <div>

                  <p className="font-medium mb-2">Document:</p>

                  {selected.documents.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <img
                      src={selected.documents}
                      className="max-h-60 rounded-lg border"
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

          <div className="flex gap-2 mt-4">
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