import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function DealerAuth() {
  const navigate = useNavigate();

  const [license, setLicense] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [step, setStep] = useState<"login" | "otp">("login");
  const [loading, setLoading] = useState(false);

  /* ================= LOGIN ================= */
  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = `${license}@dealer.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const user = data.user;

      /* 🔥 FETCH PROFILE */
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      /* 🔥 GENERATE OTP */
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);

      /* 🔥 SEND OTP (EMAIL) */
      await supabase.functions.invoke("send-otp", {
        body: {
          email: user.email,
          otp: otpCode
        }
      });

      toast.success("OTP sent to your email 📩");

      setStep("otp");

    } catch (err: any) {
      toast.error(err.message);
    }

    setLoading(false);
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async () => {
    if (otp !== generatedOtp) {
      toast.error("Invalid OTP");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    /* 🔥 REDIRECT LOGIC */
    if (profile.dealer_status === "pending") {
      navigate("/dealer-pending");
    } else if (profile.dealer_status === "approved") {
      navigate("/dealer-dashboard");
    } else {
      navigate("/dealer-profile-setup");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl"
      >

        <h2 className="text-2xl font-bold text-center mb-6">
          Dealer Login
        </h2>

        {/* LOGIN STEP */}
        {step === "login" && (
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
              {loading ? "Checking..." : "Continue"}
            </Button>

          </form>
        )}

        {/* OTP STEP */}
        {step === "otp" && (
          <div className="space-y-4">

            <Input
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />

            <Button className="w-full" onClick={verifyOtp}>
              Verify OTP
            </Button>

          </div>
        )}

      </motion.div>
    </div>
  );
}