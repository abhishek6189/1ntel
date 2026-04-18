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

  const [userEmail, setUserEmail] = useState("");
  const [dealerProfile, setDealerProfile] = useState<any>(null);

  /* ================= LOGIN ================= */
  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      /* 🔍 STEP 1: FIND DEALER BY LICENSE */
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("dealer_license_number", license)
        .single();

      if (profileError || !profile) {
        toast.error("Invalid dealer license number.");
        setLoading(false);
        return;
      }

      /* ❌ BLOCK IF NOT DEALER */
      if (profile.role !== "dealer") {
        toast.error("This account is not a dealer account.");
        setLoading(false);
        return;
      }

      /* ❌ BLOCK IF NOT APPROVED */
      if (profile.dealer_status !== "approved") {
        toast.error("Your dealer account is not approved yet.");
        setLoading(false);
        return;
      }

      /* 🔐 STEP 2: LOGIN USING EMAIL */
      const { data, error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password
      });

      if (error) {
        toast.error("Invalid password.");
        setLoading(false);
        return;
      }

      setUserEmail(profile.email);
      setDealerProfile(profile);

      /* 🔥 STEP 3: GENERATE OTP */
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);

      /* 🔥 STEP 4: SEND OTP */
      await supabase.functions.invoke("send-otp", {
        body: {
          email: profile.email,
          otp: otpCode
        }
      });

      toast.success("OTP sent to your email.");

      setStep("otp");

    } catch (err: any) {
      toast.error("Something went wrong.");
    }

    setLoading(false);
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async () => {
    if (otp !== generatedOtp) {
      toast.error("Invalid OTP.");
      return;
    }

    if (!dealerProfile) {
      toast.error("Session expired. Please login again.");
      return;
    }

    /* 🔥 FINAL REDIRECT */
    navigate("/dealer-dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border"
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

            <p className="text-xs text-center text-gray-500">
              Only approved dealers can log in
            </p>

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