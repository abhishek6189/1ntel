import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { Eye, EyeOff, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/lib/firebase";

const formatPhoneForFirebase = (value: string) => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;

  throw new Error("Enter a valid Canadian phone number.");
};

const phoneToInternalEmail = (value: string) => {
  const normalizedPhone = formatPhoneForFirebase(value).replace(/\D/g, "");
  return `${normalizedPhone}@phone.1ntel.local`;
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isLogin = searchParams.get("mode") !== "signup";

  const recaptchaRef = useRef<any>(null);
  const confirmationResultRef = useRef<any>(null);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      if (profile?.role === "dealer") {
        await supabase.auth.signOut();
        navigate("/dealer-auth", { replace: true });
        return;
      }

      navigate("/", { replace: true });
    };

    checkUser();

    return () => {
      try {
        recaptchaRef.current?.clear?.();
      } catch {}
      recaptchaRef.current = null;
      confirmationResultRef.current = null;
    };
  }, [navigate]);

  const resetVerification = () => {
    setPhoneVerified(false);
    setOtpSent(false);
    setOtp("");
    confirmationResultRef.current = null;
  };

  const sendOtp = async () => {
    if (!phone.trim()) return toast.error("Enter your phone number");

    try {
      setSendingOtp(true);
      const firebasePhone = formatPhoneForFirebase(phone);

      try {
        recaptchaRef.current?.clear?.();
      } catch {}

      recaptchaRef.current = new RecaptchaVerifier(auth, "buyer-recaptcha-container", {
        size: "invisible",
      });

      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        firebasePhone,
        recaptchaRef.current
      );

      setOtpSent(true);
      toast.success("OTP sent to your phone");
    } catch (err: any) {
      console.error("OTP error:", err);
      confirmationResultRef.current = null;
      toast.error(err?.message || "Could not send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) return toast.error("Enter OTP");
    if (!confirmationResultRef.current) return toast.error("Send OTP first");

    try {
      await confirmationResultRef.current.confirm(otp.trim());
      setPhoneVerified(true);
      toast.success("Phone verified");
    } catch (err) {
      console.error("OTP verify error:", err);
      toast.error("Invalid OTP");
    }
  };

  const ensureBuyerProfile = async (userId: string, email: string, finalPhone: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profile) return profile;

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email,
        phone: finalPhone,
        role: "buyer",
        plan: "free",
        dealer_status: null,
        profile_completed: false,
      })
      .select("id, role")
      .single();

    if (error) throw error;
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!phone.trim() || !password.trim()) {
      return toast.error("Phone and password are required");
    }

    if (!isLogin && !phoneVerified) {
      return toast.error("Please verify your phone number first");
    }

    setLoading(true);

    try {
      const finalPhone = formatPhoneForFirebase(phone);
      const authEmail = phoneToInternalEmail(phone);

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error("Login failed");

        const profile = await ensureBuyerProfile(data.user.id, authEmail, finalPhone);

        if ((profile as any)?.role === "dealer") {
          await supabase.auth.signOut();
          toast.error("Dealer accounts must use Dealer Login.");
          navigate("/dealer-auth");
          return;
        }

        navigate("/");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            phone: finalPhone,
            role: "buyer",
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Signup failed");

      await ensureBuyerProfile(data.user.id, authEmail, finalPhone);

      await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      navigate("/");
    } catch (err: any) {
      console.error("Auth error:", err);
      toast.error(err?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container flex justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-md"
        >
          <div className="glass p-6 sm:p-8 rounded-xl shadow-lg">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Phone className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isLogin
                  ? "Log in with your phone number and password."
                  : "Verify your phone number to start selling or saving cars."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  resetVerification();
                }}
                placeholder="Phone number"
                inputMode="tel"
                required
              />

              {!isLogin && (
                <div className="space-y-2 rounded-lg border bg-white/70 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={sendOtp}
                    disabled={sendingOtp || phoneVerified}
                  >
                    {phoneVerified
                      ? "Phone Verified"
                      : sendingOtp
                      ? "Sending OTP..."
                      : otpSent
                      ? "Resend OTP"
                      : "Send OTP"}
                  </Button>

                  <div className="flex gap-2">
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter OTP"
                      inputMode="numeric"
                      disabled={phoneVerified}
                    />
                    <Button
                      type="button"
                      onClick={verifyOtp}
                      disabled={phoneVerified}
                    >
                      Verify
                    </Button>
                  </div>
                </div>
              )}

              <div className="relative">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Button className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
              </Button>
            </form>

            <div className="mt-5 space-y-2 text-center text-sm">
              <Link
                to={isLogin ? "/auth?mode=signup" : "/auth?mode=login"}
                className="font-semibold text-blue-600"
              >
                {isLogin ? "Create a buyer account" : "Already have an account? Login"}
              </Link>

              <div>
                <Link to="/dealer-auth" className="text-blue-600 font-semibold">
                  Dealer Login
                </Link>
              </div>

              <div>
                <Link to="/dealer-registration" className="text-gray-500">
                  Want to signup as Dealer?
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div id="buyer-recaptcha-container" />
    </div>
  );
};

export default Auth;
