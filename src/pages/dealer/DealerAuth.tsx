import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { isAccountBanned, showBannedAccountMessage } from "@/utils/accountBan";
import { auth } from "@/lib/firebase";

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

const formatPhoneForFirebase = (value: string) => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;

  throw new Error("Enter a valid phone number with country code.");
};

const phoneToInternalEmail = (value: string) => {
  const normalizedPhone = formatPhoneForFirebase(value).replace(/\D/g, "");
  return `${normalizedPhone}@phone.1ntel.local`;
};

const getDealerAuthEmail = (profile: any) => {
  if (profile?.auth_email) return profile.auth_email;

  const savedEmail = String(profile?.email || "");
  if (savedEmail.includes("@phone.1ntel.local")) return savedEmail;

  if (profile?.phone) return phoneToInternalEmail(profile.phone);

  return "";
};

export default function DealerAuth() {
  const navigate = useNavigate();
  const recaptchaRef = useRef<any>(null);
  const confirmationResultRef = useRef<any>(null);

  const [license, setLicense] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetChannel, setResetChannel] = useState<"phone" | "email">("phone");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetPhoneVerified, setResetPhoneVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    return () => {
      try {
        recaptchaRef.current?.clear?.();
      } catch {}
      recaptchaRef.current = null;
      confirmationResultRef.current = null;
    };
  }, []);

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

      const authEmail = getDealerAuthEmail(profile);
      if (!authEmail) {
        toast.error("Dealer login is missing auth details. Please contact support.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
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

  const resetForgotState = (channel = resetChannel) => {
    setResetChannel(channel);
    setResetIdentifier("");
    setResetOtp("");
    setResetOtpSent(false);
    setResetPhoneVerified(false);
    setNewPassword("");
    confirmationResultRef.current = null;
  };

  const sendResetOtp = async () => {
    if (!resetIdentifier.trim()) {
      toast.error(resetChannel === "phone" ? "Enter your phone number" : "Enter your email address");
      return;
    }

    try {
      setSendingOtp(true);

      if (resetChannel === "phone") {
        const firebasePhone = formatPhoneForFirebase(resetIdentifier);

        try {
          recaptchaRef.current?.clear?.();
        } catch {}

        recaptchaRef.current = new RecaptchaVerifier(auth, "dealer-reset-recaptcha", {
          size: "invisible",
        });

        confirmationResultRef.current = await signInWithPhoneNumber(
          auth,
          firebasePhone,
          recaptchaRef.current
        );

        setResetOtpSent(true);
        toast.success("OTP sent to your phone");
        return;
      }

      const email = resetIdentifier.trim().toLowerCase();
      if (!isValidEmail(email)) {
        toast.error("Enter a valid email address");
        return;
      }

      const { data, error } = await supabase.functions.invoke("request-email-otp", {
        body: {
          email,
          purpose: "password_reset",
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Could not send email OTP");
      }

      setResetOtpSent(true);
      toast.success("Email OTP sent");
    } catch (err: any) {
      console.error("Dealer reset OTP error:", err);
      toast.error(err?.message || "Could not send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyResetPhoneOtp = async () => {
    if (!resetOtp.trim()) return toast.error("Enter OTP");
    if (!confirmationResultRef.current) return toast.error("Send OTP first");

    try {
      await confirmationResultRef.current.confirm(resetOtp.trim());
      setResetPhoneVerified(true);
      toast.success("Phone verified");
    } catch (err) {
      console.error("Dealer reset phone verify error:", err);
      toast.error("Invalid OTP");
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!resetIdentifier.trim()) return toast.error("Enter your phone or email");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (resetChannel === "email" && !resetOtp.trim()) return toast.error("Enter email OTP");
    if (resetChannel === "phone" && !resetPhoneVerified) {
      return toast.error("Please verify your phone OTP first");
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: {
          channel: resetChannel,
          identifier:
            resetChannel === "phone"
              ? formatPhoneForFirebase(resetIdentifier)
              : resetIdentifier.trim().toLowerCase(),
          code: resetChannel === "email" ? resetOtp.trim() : "firebase-phone-verified",
          newPassword,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Password reset failed");
      }

      toast.success("Password updated. Please login with your new password.");
      setForgotMode(false);
      resetForgotState();
    } catch (err: any) {
      console.error("Dealer password reset error:", err);
      toast.error(err?.message || "Password reset failed");
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
        <h2 className="text-2xl font-bold text-center mb-6">
          {forgotMode ? "Reset Dealer Password" : "Dealer Login"}
        </h2>

        {forgotMode ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-gray-50 p-1">
              <Button
                type="button"
                variant={resetChannel === "phone" ? "default" : "ghost"}
                onClick={() => resetForgotState("phone")}
              >
                Phone OTP
              </Button>
              <Button
                type="button"
                variant={resetChannel === "email" ? "default" : "ghost"}
                onClick={() => resetForgotState("email")}
              >
                Email OTP
              </Button>
            </div>

            <Input
              placeholder={resetChannel === "phone" ? "Phone number" : "Email address"}
              value={resetIdentifier}
              onChange={(e) => {
                setResetIdentifier(e.target.value);
                setResetOtpSent(false);
                setResetPhoneVerified(false);
              }}
              inputMode={resetChannel === "phone" ? "tel" : "email"}
              required
            />

            <div className="flex gap-2">
              <Input
                placeholder="Enter OTP"
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={resetChannel === "phone" && resetPhoneVerified}
                inputMode="numeric"
              />
              <Button type="button" onClick={sendResetOtp} disabled={sendingOtp}>
                {resetOtpSent ? "Resend" : "Send"}
              </Button>
              {resetChannel === "phone" && (
                <Button type="button" onClick={verifyResetPhoneOtp} disabled={resetPhoneVerified}>
                  {resetPhoneVerified ? "Verified" : "Verify"}
                </Button>
              )}
            </div>

            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Button className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>

            <button
              type="button"
              className="w-full text-sm font-semibold text-blue-600"
              onClick={() => {
                setForgotMode(false);
                resetForgotState();
              }}
            >
              Back to dealer login
            </button>
          </form>
        ) : (
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

            <button
              type="button"
              className="w-full text-sm font-semibold text-blue-600"
              onClick={() => {
                setForgotMode(true);
                resetForgotState();
              }}
            >
              Forgot password?
            </button>

            <p className="text-xs text-center text-gray-500">
              Only approved dealers can log in
            </p>
          </form>
        )}
      </motion.div>

      <div id="dealer-reset-recaptcha" />
    </div>
  );
}
