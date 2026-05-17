import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { isAccountBanned, showBannedAccountMessage } from "@/utils/accountBan";

export default function DealerAuth() {
  const navigate = useNavigate();

  const [license, setLicense] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!license.trim() || !password.trim()) {
      toast.error("Dealer license number and password are required.");
      return;
    }

    setLoading(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("dealer_license_number", license.trim())
        .maybeSingle();

      if (profileError || !profile) {
        toast.error("Invalid dealer license number.");
        return;
      }

      if (isAccountBanned(profile)) {
        showBannedAccountMessage();
        return;
      }

      if (String(profile.role || "").toLowerCase() !== "dealer") {
        toast.error("This account is not a dealer account.");
        return;
      }

      if (String(profile.dealer_status || "").toLowerCase() !== "approved") {
        toast.error("Your dealer account is not approved yet.");
        return;
      }

      if (!profile.email) {
        toast.error("Dealer login is missing an account email. Please contact support.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (error) {
        toast.error("Invalid password.");
        return;
      }

      navigate("/dealer-dashboard", { replace: true });
    } catch (err) {
      console.error("Dealer login error:", err);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border"
      >
        <h2 className="text-2xl font-bold text-center mb-6">Dealer Login</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            placeholder="Dealer License Number"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            required
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button className="w-full" disabled={loading}>
            {loading ? "Checking..." : "Login"}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Only approved dealers can log in
          </p>
        </form>
      </motion.div>
    </div>
  );
}
