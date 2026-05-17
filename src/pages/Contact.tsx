import { FormEvent, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const supportEmail = "1ntelcarz@gmail.com";
const supportPhone = "+14378607157";

const Contact = () => {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const { error } = await (supabase as any).from("contact_messages").insert({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      message: form.message.trim(),
      status: "new",
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Could not send your message.");
      return;
    }

    toast.success("Message sent successfully. Our team will contact you soon.");
    setForm({
      name: "",
      email: "",
      phone: "",
      message: "",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold text-blue-600">Contact 1ntel</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Get in Touch
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Reach out for account help, inspection questions, dealer support, or marketplace issues.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="space-y-4">
            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-4 rounded-lg border bg-white p-5 transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Email</p>
                <p className="text-sm text-muted-foreground">{supportEmail}</p>
              </div>
            </a>

            <a
              href={`tel:${supportPhone}`}
              className="flex items-center gap-4 rounded-lg border bg-white p-5 transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Phone</p>
                <p className="text-sm text-muted-foreground">+1 437 860 7157</p>
              </div>
            </a>
          </section>

          <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="+1 437 860 7157"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(event) => update("message", event.target.value)}
                  rows={6}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="mt-5 w-full sm:w-auto" disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
