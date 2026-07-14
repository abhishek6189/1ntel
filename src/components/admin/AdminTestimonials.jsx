import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Star, Trash2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const statusStyles = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const roleLabel = (role) => {
  if (!role) return "User";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const Rating = ({ value = 5 }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 ${
          star <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"
        }`}
      />
    ))}
  </div>
);

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const fetchTestimonials = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("site_testimonials")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      toast.error(error.message || "Could not load testimonials");
      return;
    }

    setTestimonials(data || []);
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const grouped = useMemo(() => {
    const rows = [...testimonials];
    return rows.sort((a, b) => {
      const rank = { pending: 0, approved: 1, rejected: 2 };
      const statusDiff = (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
      if (statusDiff) return statusDiff;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [testimonials]);

  const counts = useMemo(
    () => ({
      pending: testimonials.filter((item) => item.status === "pending").length,
      approved: testimonials.filter((item) => item.status === "approved").length,
      rejected: testimonials.filter((item) => item.status === "rejected").length,
    }),
    [testimonials]
  );

  const setStatus = async (testimonial, status) => {
    setBusyId(testimonial.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updates = {
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      approved_by: status === "approved" ? user?.id || null : null,
    };

    const { error } = await supabase
      .from("site_testimonials")
      .update(updates)
      .eq("id", testimonial.id);

    setBusyId("");

    if (error) {
      toast.error(error.message || "Could not update testimonial");
      return;
    }

    toast.success(status === "approved" ? "Testimonial approved" : "Testimonial rejected");
    fetchTestimonials();
  };

  const deleteTestimonial = async (testimonial) => {
    if (!window.confirm("Delete this testimonial permanently?")) return;

    setBusyId(testimonial.id);

    const { error } = await supabase
      .from("site_testimonials")
      .delete()
      .eq("id", testimonial.id);

    setBusyId("");

    if (error) {
      toast.error(error.message || "Could not delete testimonial");
      return;
    }

    toast.success("Testimonial deleted");
    fetchTestimonials();
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Testimonials</h3>
          <p className="text-sm text-muted-foreground">
            Approve real reviews before they appear on the homepage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{counts.pending} pending</Badge>
          <Badge variant="outline">{counts.approved} approved</Badge>
          <Badge variant="outline">{counts.rejected} rejected</Badge>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Loading testimonials...
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No testimonials submitted yet
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((testimonial) => (
            <div key={testimonial.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">
                      {testimonial.display_name || "No name"}
                    </h4>
                    <Badge className={statusStyles[testimonial.status] || "bg-slate-100"}>
                      {testimonial.status || "pending"}
                    </Badge>
                    <Badge variant="outline">{roleLabel(testimonial.role)}</Badge>
                    <Rating value={testimonial.rating} />
                  </div>

                  <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                    {testimonial.message}
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {testimonial.location && <span>{testimonial.location}</span>}
                    <span>
                      {testimonial.created_at
                        ? new Date(testimonial.created_at).toLocaleString()
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {testimonial.status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === testimonial.id}
                      onClick={() => setStatus(testimonial, "approved")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  )}

                  {testimonial.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === testimonial.id}
                      onClick={() => setStatus(testimonial, "rejected")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === testimonial.id}
                    onClick={() => deleteTestimonial(testimonial)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
