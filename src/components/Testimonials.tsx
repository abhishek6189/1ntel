import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, MessageSquareText, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Testimonial = {
  id: string;
  display_name: string;
  role?: string | null;
  location?: string | null;
  rating: number;
  message: string;
  created_at?: string | null;
};

type CurrentUser = {
  id: string;
  email?: string | null;
};

const fallbackTestimonials: Testimonial[] = [
  {
    id: "fallback-1",
    display_name: "A. Patel",
    role: "buyer",
    location: "Toronto, ON",
    rating: 5,
    message:
      "The listing details and inspection option made it easier to compare cars before calling the seller.",
  },
  {
    id: "fallback-2",
    display_name: "Northline Motors",
    role: "dealer",
    location: "Mississauga, ON",
    rating: 5,
    message:
      "1ntel gave our inventory a cleaner online presence and helped serious shoppers reach us faster.",
  },
  {
    id: "fallback-3",
    display_name: "M. Chen",
    role: "seller",
    location: "Scarborough, ON",
    rating: 5,
    message:
      "The marketplace feels simple, focused, and built for people who want the car buying process to feel safer.",
  },
];

const roleOptions = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "dealer", label: "Dealer" },
  { value: "inspector", label: "Inspector" },
  { value: "user", label: "User" },
];

const roleLabel = (role?: string | null) =>
  roleOptions.find((option) => option.value === role)?.label || "User";

const getDisplayName = (profile: any, user?: CurrentUser | null) => {
  const profileName =
    profile?.full_name ||
    profile?.name ||
    profile?.username ||
    profile?.dealer_name ||
    profile?.business_name;

  if (profileName) return profileName;
  if (user?.email) return user.email.split("@")[0];
  return "";
};

const RatingStars = ({
  rating,
  interactive = false,
  onChange,
}: {
  rating: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((value) => {
      const filled = value <= rating;
      const icon = (
        <Star
          className={`h-4 w-4 ${
            filled ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      );

      if (!interactive) {
        return <span key={value}>{icon}</span>;
      }

      return (
        <button
          key={value}
          type="button"
          aria-label={`Rate ${value} out of 5`}
          onClick={() => onChange?.(value)}
          className="rounded-md p-1 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          {icon}
        </button>
      );
    })}
  </div>
);

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    role: "buyer",
    location: "",
    rating: 5,
    message: "",
  });

  const visibleTestimonials = useMemo(
    () => (testimonials.length ? testimonials : fallbackTestimonials),
    [testimonials]
  );

  useEffect(() => {
    let active = true;

    const loadTestimonials = async () => {
      const { data, error } = await (supabase as any)
        .from("site_testimonials")
        .select("id, display_name, role, location, rating, message, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!active) return;

      if (!error) {
        setTestimonials(data || []);
      }

      setLoading(false);
    };

    const loadUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!active || !authUser) return;

      const currentUser = {
        id: authUser.id,
        email: authUser.email,
      };

      setUser(currentUser);

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, name, username, dealer_name, business_name, role, city, province")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!active) return;

      const location = [profile?.city, profile?.province].filter(Boolean).join(", ");

      setForm((current) => ({
        ...current,
        display_name: current.display_name || getDisplayName(profile, currentUser),
        role: roleOptions.some((option) => option.value === profile?.role)
          ? profile.role
          : current.role,
        location: current.location || location,
      }));
    };

    loadTestimonials();
    loadUser();

    const channel = supabase
      .channel("site-testimonials-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_testimonials" },
        loadTestimonials
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const submitTestimonial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      toast.error("Please log in to share your experience");
      return;
    }

    const displayName = form.display_name.trim();
    const message = form.message.trim();

    if (!displayName) {
      toast.error("Please add your display name");
      return;
    }

    if (message.length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }

    setSubmitting(true);

    const { data: existing, error: existingError } = await (supabase as any)
      .from("site_testimonials")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"])
      .limit(1)
      .maybeSingle();

    if (!existingError && existing) {
      setSubmitting(false);
      toast.info(
        existing.status === "pending"
          ? "Your testimonial is already pending review."
          : "Your testimonial is already published."
      );
      return;
    }

    const { error } = await (supabase as any).from("site_testimonials").insert({
      user_id: user.id,
      display_name: displayName,
      role: form.role,
      location: form.location.trim() || null,
      rating: form.rating,
      message,
      status: "pending",
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Could not submit testimonial");
      return;
    }

    setForm((current) => ({ ...current, message: "" }));
    toast.success("Thanks. Your testimonial is pending review.");
  };

  return (
    <section className="px-4 py-12 sm:px-0 sm:py-16 lg:py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-8 max-w-2xl text-center sm:mb-12"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Customer proof
          </p>
          <h2 className="font-heading text-2xl font-bold text-slate-950 sm:text-3xl md:text-4xl">
            What Our Users Say
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Real marketplace reviews, published only after admin approval.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTestimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <RatingStars rating={testimonial.rating} />
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {roleLabel(testimonial.role)}
                </span>
              </div>
              <p className="min-h-[96px] text-sm leading-6 text-slate-700">
                "{testimonial.message}"
              </p>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="font-heading text-sm font-semibold text-slate-950">
                  {testimonial.display_name}
                </p>
                {testimonial.location && (
                  <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-slate-950">
                <MessageSquareText className="h-5 w-5 text-blue-600" />
                Share your experience
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Help new buyers and dealers understand the 1ntel experience.
              </p>
            </div>
            {loading && (
              <span className="text-xs font-medium text-muted-foreground">Loading...</span>
            )}
          </div>

          {!user ? (
            <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-700">
                Log in to submit a verified review for approval.
              </p>
              <Button asChild className="w-full sm:w-auto">
                <Link to="/auth?mode=login">Log in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submitTestimonial} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="testimonial-name">Display name</Label>
                  <Input
                    id="testimonial-name"
                    value={form.display_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        display_name: event.target.value,
                      }))
                    }
                    placeholder="Your name or dealership"
                    maxLength={80}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testimonial-location">Location</Label>
                  <Input
                    id="testimonial-location"
                    value={form.location}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    placeholder="Toronto, ON"
                    maxLength={80}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="testimonial-role">Role</Label>
                  <select
                    id="testimonial-role"
                    value={form.role}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, role: event.target.value }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Rating</Label>
                  <RatingStars
                    rating={form.rating}
                    interactive
                    onChange={(rating) =>
                      setForm((current) => ({ ...current, rating }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testimonial-message">Review</Label>
                <Textarea
                  id="testimonial-message"
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, message: event.target.value }))
                  }
                  placeholder="Tell people what worked well for you."
                  maxLength={500}
                  rows={4}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {form.message.length}/500
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Admin approval required before publishing.
                </p>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit review"}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
