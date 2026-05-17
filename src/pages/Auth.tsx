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
import { isAccountBanned, showBannedAccountMessage } from "@/utils/accountBan";

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

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

const getMissingSchemaColumn = (error: any) => {
  const message = String(error?.message || error?.details || "");
  const quotedMatch = message.match(/Could not find the '([^']+)' column/i);
  const pgMatch = message.match(/column "?([^"\s]+)"? .*does not exist/i);
  return quotedMatch?.[1] || pgMatch?.[1] || null;
};

const isDuplicateKeyError = (error: any) =>
  error?.code === "23505" ||
  String(error?.message || "").toLowerCase().includes("duplicate key value");

const isMissingColumnError = (error: any) => Boolean(getMissingSchemaColumn(error));

const findProfileByColumn = async (column: string, value?: string | null) => {
  if (!value) return null;

  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq(column, value)
    .maybeSingle();

  if (!error) return data;

  if (isMissingColumnError(error)) return null;

  console.warn(`Could not read profile by ${column}:`, error);
  return null;
};

const findProfileForAuth = async (userId: string, email?: string | null, phone?: string | null) =>
  (await findProfileByColumn("id", userId)) ||
  (await findProfileByColumn("user_id", userId)) ||
  (await findProfileByColumn("email", email)) ||
  (await findProfileByColumn("phone", phone));

const updateProfileWithFallback = async (
  profile: Record<string, any>,
  payload: Record<string, any>
) => {
  const keys = [
    profile?.id ? ["id", profile.id] : null,
    profile?.user_id ? ["user_id", profile.user_id] : null,
  ].filter(Boolean) as string[][];

  for (const [column, value] of keys) {
    const currentPayload = { ...payload };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { error } = await (supabase as any)
        .from("profiles")
        .update(currentPayload)
        .eq(column, value);

      if (!error) return true;

      const missingColumn = getMissingSchemaColumn(error);
      if (missingColumn === column) break;
      if (missingColumn && missingColumn in currentPayload) {
        delete currentPayload[missingColumn];
        continue;
      }

      console.warn("Could not update profile:", error);
      return false;
    }
  }

  return false;
};

const insertProfileWithFallback = async (payloads: Record<string, any>[]) => {
  for (const payload of payloads) {
    const currentPayload = { ...payload };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { error } = await (supabase as any).from("profiles").insert(currentPayload);
      if (!error) return true;

      if (isDuplicateKeyError(error)) return false;

      const missingColumn = getMissingSchemaColumn(error);
      if (missingColumn && missingColumn in currentPayload) {
        delete currentPayload[missingColumn];
        continue;
      }

      const message = String(error?.message || "");
      if (error?.code === "23502" && message.includes("null value")) break;

      throw error;
    }
  }

  return false;
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isLogin = searchParams.get("mode") !== "signup";

  const recaptchaRef = useRef<any>(null);
  const confirmationResultRef = useRef<any>(null);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);
  const [resetChannel, setResetChannel] = useState<"phone" | "email">("phone");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetPhoneVerified, setResetPhoneVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const mode = searchParams.get("mode");
  const isForgot = mode === "forgot";

  useEffect(() => {
    const checkUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const metadataPhone = String(user.user_metadata?.phone || "");
      const profile = await findProfileForAuth(user.id, user.email, metadataPhone);

      if (isAccountBanned(profile)) {
        await supabase.auth.signOut();
        showBannedAccountMessage();
        return;
      }

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

  useEffect(() => {
    if (otpCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setOtpCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (emailOtpCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setEmailOtpCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [emailOtpCooldown]);

  const resetVerification = () => {
    setPhoneVerified(false);
    setOtpSent(false);
    setOtp("");
    confirmationResultRef.current = null;
  };

  const resetEmailVerification = () => {
    setEmailVerified(false);
    setEmailOtpSent(false);
    setEmailOtp("");
  };

  const sendEmailOtp = async (targetEmail = email, purpose = "signup") => {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) return toast.error("Enter a valid email address");

    if (purpose === "signup" && emailOtpCooldown > 0) {
      return toast.info(`Please wait ${emailOtpCooldown}s before requesting another email OTP.`);
    }

    try {
      setSendingEmailOtp(true);
      const { data, error } = await supabase.functions.invoke("request-email-otp", {
        body: {
          email: normalizedEmail,
          purpose,
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message || "Could not send email OTP");

      if (purpose === "signup") {
        setEmailOtpSent(true);
        setEmailOtpCooldown(60);
      }

      toast.success("Email OTP sent");
      return true;
    } catch (err: any) {
      console.error("Email OTP error:", err);
      toast.error(err?.message || "Could not send email OTP");
      return false;
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!emailOtp.trim()) return toast.error("Enter email OTP");

    try {
      const { data, error } = await supabase.functions.invoke("verify-email-otp", {
        body: {
          email: email.trim().toLowerCase(),
          code: emailOtp.trim(),
          purpose: "signup",
        },
      });

      if (error || data?.error || !data?.verified) {
        throw new Error(data?.error || error?.message || "Invalid email OTP");
      }

      setEmailVerified(true);
      toast.success("Email verified");
    } catch (err: any) {
      console.error("Email verify error:", err);
      toast.error(err?.message || "Invalid email OTP");
    }
  };

  const sendOtp = async () => {
    if (!phone.trim()) return toast.error("Enter your phone number");

    if (otpCooldown > 0) {
      return toast.info(`Please wait ${otpCooldown}s before requesting another OTP.`);
    }

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
      setOtpCooldown(60);
    } catch (err: any) {
      console.error("OTP error:", err);
      confirmationResultRef.current = null;

      if (err?.code === "auth/too-many-requests") {
        setOtpCooldown(120);
        toast.error("OTP is temporarily blocked for this number or device. Please wait a few minutes, then try again.");
      } else if (err?.code === "auth/invalid-phone-number") {
        toast.error("Please enter a valid Canadian phone number.");
      } else if (err?.code === "auth/network-request-failed") {
        toast.error("Network issue while sending OTP. Please check your connection and try again.");
      } else {
        toast.error("Could not send OTP. Please try again in a moment.");
      }
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

  const ensureBuyerProfile = async (
    userId: string,
    authEmail: string,
    finalPhone: string,
    contactEmail: string
  ) => {
    const profile = await findProfileForAuth(userId, authEmail, finalPhone);

    if (profile) {
      const role = String(profile.role || "").trim().toLowerCase();

      if (role === "admin" || role === "dealer") return profile;

      await updateProfileWithFallback(profile, {
        email: profile.email || contactEmail,
        auth_email: authEmail,
        phone: profile.phone || finalPhone,
        role: profile.role || "buyer",
        plan: profile.plan || "free",
        dealer_status: profile.dealer_status ?? null,
      });

      return (await findProfileForAuth(userId, authEmail, finalPhone)) || profile;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (
      userData.user?.id === userId &&
      String(userData.user.user_metadata?.role || "").toLowerCase() === "dealer"
    ) {
      return {
        id: userId,
        role: "dealer",
        dealer_status: userData.user.user_metadata?.dealer_status || "pending",
      };
    }

    const { data: dealerRequest } = await (supabase as any)
      .from("dealer_requests")
      .select("id, status")
      .or(`user_id.eq.${userId},email.eq.${contactEmail},phone.eq.${finalPhone}`)
      .maybeSingle();

    if (dealerRequest) {
      return {
        id: userId,
        role: "dealer",
        dealer_status: dealerRequest.status || "pending",
      };
    }

    const baseProfile = {
      email: contactEmail,
      auth_email: authEmail,
      phone: finalPhone,
      role: "buyer",
      plan: "free",
      dealer_status: null,
      profile_completed: false,
    };

    const inserted = await insertProfileWithFallback([
      {
        id: userId,
        ...baseProfile,
      },
      {
        user_id: userId,
        ...baseProfile,
      },
      {
        id: userId,
        user_id: userId,
        ...baseProfile,
      },
    ]);

    const savedProfile = await findProfileForAuth(userId, authEmail, finalPhone);
    if (savedProfile) return savedProfile;

    if (!inserted) {
      return {
        id: userId,
        role: "buyer",
        plan: "free",
      };
    }

    throw new Error("Profile was created but could not be loaded. Please refresh and try again.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (isForgot) {
      return handlePasswordReset();
    }

    if (!phone.trim() || !password.trim()) {
      return toast.error("Phone and password are required");
    }

    if (!isLogin && !phoneVerified) {
      return toast.error("Please verify your phone number first");
    }

    if (!isLogin && (!email.trim() || !isValidEmail(email))) {
      return toast.error("Enter a valid email address");
    }

    if (!isLogin && !emailVerified) {
      return toast.error("Please verify your email address first");
    }

    setLoading(true);

    try {
      const finalPhone = formatPhoneForFirebase(phone);
      const authEmail = phoneToInternalEmail(phone);
      const contactEmail = email.trim().toLowerCase();

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error("Login failed");

        const profile = await ensureBuyerProfile(data.user.id, authEmail, finalPhone, contactEmail);

        if (isAccountBanned(profile)) {
          await supabase.auth.signOut();
          showBannedAccountMessage();
          return;
        }

        if (String((profile as any)?.role || "").trim().toLowerCase() === "admin") {
          navigate("/admin", { replace: true });
          return;
        }

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
            contact_email: contactEmail,
            role: "buyer",
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Signup failed");

      await ensureBuyerProfile(data.user.id, authEmail, finalPhone, contactEmail);

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

  const sendResetOtp = async () => {
    if (!resetIdentifier.trim()) {
      return toast.error(resetChannel === "phone" ? "Enter your phone number" : "Enter your email address");
    }

    try {
      if (resetChannel === "phone") {
        setSendingOtp(true);
        const firebasePhone = formatPhoneForFirebase(resetIdentifier);

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

        setResetOtpSent(true);
        toast.success("OTP sent to your phone");
        return;
      }

      const sent = await sendEmailOtp(resetIdentifier, "password_reset");
      if (sent) setResetOtpSent(true);
    } catch (err: any) {
      console.error("Reset OTP error:", err);
      toast.error(err?.message || "Could not send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyResetPhoneOtp = async () => {
    if (resetChannel !== "phone") return;
    if (!resetOtp.trim()) return toast.error("Enter OTP");
    if (!confirmationResultRef.current) return toast.error("Send OTP first");

    try {
      await confirmationResultRef.current.confirm(resetOtp.trim());
      setResetPhoneVerified(true);
      toast.success("Phone verified");
    } catch (err) {
      console.error("Reset phone verify error:", err);
      toast.error("Invalid OTP");
    }
  };

  const handlePasswordReset = async () => {
    if (!resetIdentifier.trim()) return toast.error("Enter your phone or email");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (resetChannel === "email" && !resetOtp.trim()) return toast.error("Enter email OTP");
    if (resetChannel === "phone" && !resetPhoneVerified) return toast.error("Please verify your phone OTP first");

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

      if (error || data?.error) throw new Error(data?.error || error?.message || "Password reset failed");

      toast.success("Password updated. Please login with your new password.");
      navigate("/auth?mode=login", { replace: true });
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error(err?.message || "Password reset failed");
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
                {isForgot ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isForgot
                  ? "Choose email or phone OTP, then set a new password."
                  : isLogin
                  ? "Log in with your phone number and password."
                  : "Verify your phone number and email to start using 1ntel."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isForgot ? (
                <>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border bg-white/70 p-1">
                    <Button
                      type="button"
                      variant={resetChannel === "phone" ? "default" : "ghost"}
                      onClick={() => {
                        setResetChannel("phone");
                        setResetOtp("");
                        setResetOtpSent(false);
                        setResetPhoneVerified(false);
                      }}
                    >
                      Phone OTP
                    </Button>
                    <Button
                      type="button"
                      variant={resetChannel === "email" ? "default" : "ghost"}
                      onClick={() => {
                        setResetChannel("email");
                        setResetOtp("");
                        setResetOtpSent(false);
                        setResetPhoneVerified(false);
                      }}
                    >
                      Email OTP
                    </Button>
                  </div>

                  <Input
                    value={resetIdentifier}
                    onChange={(e) => {
                      setResetIdentifier(e.target.value);
                      setResetOtpSent(false);
                      setResetPhoneVerified(false);
                    }}
                    placeholder={resetChannel === "phone" ? "Phone number" : "Email address"}
                    inputMode={resetChannel === "phone" ? "tel" : "email"}
                    required
                  />

                  <div className="flex gap-2">
                    <Input
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter OTP"
                      inputMode="numeric"
                      disabled={resetChannel === "phone" && resetPhoneVerified}
                    />
                    <Button type="button" onClick={sendResetOtp} disabled={sendingOtp || sendingEmailOtp}>
                      {resetOtpSent ? "Resend" : "Send"}
                    </Button>
                    {resetChannel === "phone" && (
                      <Button type="button" onClick={verifyResetPhoneOtp} disabled={resetPhoneVerified}>
                        {resetPhoneVerified ? "Verified" : "Verify"}
                      </Button>
                    )}
                  </div>

                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    type="password"
                    required
                  />
                </>
              ) : (
                <>
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
                    <Input
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        resetEmailVerification();
                      }}
                      placeholder="Email address"
                      inputMode="email"
                      type="email"
                      required
                    />
                  )}
                </>
              )}

              {!isLogin && !isForgot && (
                <div className="space-y-2 rounded-lg border bg-white/70 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={sendOtp}
                    disabled={sendingOtp || phoneVerified || otpCooldown > 0}
                  >
                    {phoneVerified
                      ? "Phone Verified"
                      : sendingOtp
                      ? "Sending OTP..."
                      : otpCooldown > 0
                      ? `Wait ${otpCooldown}s`
                      : otpSent
                      ? "Resend OTP"
                      : "Send OTP"}
                  </Button>

                  {otpCooldown > 0 && !phoneVerified && (
                    <p className="text-xs text-muted-foreground">
                      To protect your account, please wait before requesting another OTP.
                    </p>
                  )}

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

              {!isLogin && !isForgot && (
                <div className="space-y-2 rounded-lg border bg-white/70 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => sendEmailOtp()}
                    disabled={sendingEmailOtp || emailVerified || emailOtpCooldown > 0}
                  >
                    {emailVerified
                      ? "Email Verified"
                      : sendingEmailOtp
                      ? "Sending Email OTP..."
                      : emailOtpCooldown > 0
                      ? `Wait ${emailOtpCooldown}s`
                      : emailOtpSent
                      ? "Resend Email OTP"
                      : "Send Email OTP"}
                  </Button>

                  <div className="flex gap-2">
                    <Input
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter email OTP"
                      inputMode="numeric"
                      disabled={emailVerified}
                    />
                    <Button
                      type="button"
                      onClick={verifyEmailOtp}
                      disabled={emailVerified}
                    >
                      Verify
                    </Button>
                  </div>
                </div>
              )}

              {!isForgot && (
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
              )}

              <Button className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isForgot ? "Update Password" : isLogin ? "Login" : "Sign Up"}
              </Button>
            </form>

            <div className="mt-5 space-y-2 text-center text-sm">
              {isLogin && !isForgot && (
                <div>
                  <Link to="/auth?mode=forgot" className="font-semibold text-blue-600">
                    Forgot password?
                  </Link>
                </div>
              )}

              <Link
                to={isLogin && !isForgot ? "/auth?mode=signup" : "/auth?mode=login"}
                className="font-semibold text-blue-600"
              >
                {isLogin && !isForgot ? "Create a buyer account" : "Already have an account? Login"}
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
