import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import GlobalLoader from "@/components/GlobalLoader";
import SEO from "@/components/SEO";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";

const provinces = ["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "NT", "NU", "YT"];
const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

export default function DealerSetup() {
  const navigate = useNavigate();
  const recaptchaRef = useRef<any>(null);
  const confirmationResultRef = useRef<any>(null);

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
    full_name: "",
    business_name: "",
    dealer_license_number: "",
    phone: "",
    email: "",
    city: "",
    province: "",
  });

  const [docFile, setDocFile] = useState<any>(null);
  const [docName, setDocName] = useState("");
  const [docPreview, setDocPreview] = useState("");
  const [step, setStep] = useState(0);

  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);

  const passwordsMatch =
    form.password.length >= 6 &&
    form.confirmPassword.length >= 6 &&
    form.password === form.confirmPassword;

  const detailsComplete = Boolean(
    form.full_name.trim() &&
      form.business_name.trim() &&
      form.dealer_license_number.trim() &&
      form.city.trim() &&
      form.province
  );
  const canSubmit = phoneVerified && emailVerified && passwordsMatch && detailsComplete && docFile && !loading;

  const steps = [
    { label: "Phone", icon: Phone, complete: phoneVerified },
    { label: "Email", icon: Mail, complete: emailVerified },
    { label: "Password", icon: ShieldCheck, complete: passwordsMatch },
    { label: "Business", icon: Building2, complete: detailsComplete },
    { label: "Document", icon: FileText, complete: Boolean(docFile) },
  ];

  const handleChange = (field: string, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));

    if (field === "phone") {
      setPhoneVerified(false);
      setPhoneOtp("");
      confirmationResultRef.current = null;
    }

    if (field === "email") {
      setEmailVerified(false);
      setEmailOtp("");
    }
  };

  useEffect(() => {
    return () => {
      try {
        recaptchaRef.current?.clear?.();
      } catch {}
      recaptchaRef.current = null;
    };
  }, []);

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

  const handleFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFile(file);
    setDocName(file.name);

    if (file.type.startsWith("image/")) {
      setDocPreview(URL.createObjectURL(file));
    } else {
      setDocPreview("pdf");
    }
  };

  const getFirebasePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");

    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;

    throw new Error("Enter a valid Canadian phone number.");
  };

  const phoneToInternalEmail = (value: string) => {
    const normalizedPhone = getFirebasePhone(value).replace(/\D/g, "");
    return `${normalizedPhone}@phone.1ntel.local`;
  };

  const resetRecaptcha = () => {
    try {
      recaptchaRef.current?.clear?.();
    } catch {}

    recaptchaRef.current = null;
    confirmationResultRef.current = null;
  };

  const sendPhoneOtp = async () => {
    if (!form.phone) return toast.error("Enter phone");

    if (otpCooldown > 0) {
      return toast.info(`Please wait ${otpCooldown}s before requesting another OTP.`);
    }

    try {
      setSendingPhoneOtp(true);

      const finalPhone = getFirebasePhone(form.phone);
      console.log("PHONE FINAL:", finalPhone);

      resetRecaptcha();

      recaptchaRef.current = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );

      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        finalPhone,
        recaptchaRef.current
      );

      toast.success("OTP sent");
      setOtpCooldown(60);
    } catch (err: any) {
      console.error("PHONE OTP ERROR:", err);
      resetRecaptcha();

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
      setSendingPhoneOtp(false);
    }
  };

  const verifyPhone = async () => {
    if (!phoneOtp) return toast.error("Enter OTP");

    if (!confirmationResultRef.current) {
      toast.error("Please send OTP first");
      return;
    }

    try {
      await confirmationResultRef.current.confirm(phoneOtp.trim());
      setPhoneVerified(true);
      toast.success("Phone verified");
    } catch (err: any) {
      console.error("PHONE VERIFY ERROR:", err);
      toast.error("Invalid OTP");
    }
  };

  const sendEmailOtp = async () => {
    const contactEmail = form.email.trim().toLowerCase();
    if (!isValidEmail(contactEmail)) return toast.error("Enter a valid email");

    if (emailOtpCooldown > 0) {
      return toast.info(`Please wait ${emailOtpCooldown}s before requesting another email OTP.`);
    }

    try {
      setSendingEmailOtp(true);
      const { data, error } = await supabase.functions.invoke("request-email-otp", {
        body: {
          email: contactEmail,
          purpose: "signup",
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message || "Could not send email OTP");

      toast.success("Email OTP sent");
      setEmailOtpCooldown(60);
    } catch (err: any) {
      console.error("EMAIL OTP ERROR:", err);
      toast.error(err.message || "Could not send email OTP");
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const verifyEmail = async () => {
    const contactEmail = form.email.trim().toLowerCase();
    if (!emailOtp) return toast.error("Enter email OTP");
    if (!isValidEmail(contactEmail)) return toast.error("Enter a valid email");

    try {
      const { data, error } = await supabase.functions.invoke("verify-email-otp", {
        body: {
          email: contactEmail,
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
      console.error("EMAIL VERIFY ERROR:", err);
      toast.error(err.message || "Invalid email OTP");
    }
  };

  const checkPhoneExists = async (finalPhone: string, contactEmail: string) => {
    const possiblePhones = [
      finalPhone,
      finalPhone.replace(/\D/g, ""),
      finalPhone.replace(/^\+1/, ""),
    ];

    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, phone, email, role, dealer_status")
      .or(
        `phone.in.(${possiblePhones.map((phone) => `"${phone}"`).join(",")}),email.eq.${contactEmail}`
      )
      .maybeSingle();

    if (profileError) throw profileError;

    if (existingProfile) {
      const existingRole = String((existingProfile as any).role || "").toLowerCase();
      const samePhone = possiblePhones.includes(String((existingProfile as any).phone || ""));
      const sameEmail = String((existingProfile as any).email || "").toLowerCase() === contactEmail;

      if (existingRole === "dealer" || existingRole === "admin") {
        throw new Error("This account is already registered as a dealer.");
      }

      if (!samePhone || !sameEmail) {
        throw new Error("This email or phone is already used by another account.");
      }
    }

    const { data: existingRequest, error: requestError } = await supabase
      .from("dealer_requests")
      .select("id, phone, email, status")
      .or(
        `phone.in.(${possiblePhones.map((phone) => `"${phone}"`).join(",")}),email.eq.${contactEmail}`
      )
      .maybeSingle();

    if (requestError) throw requestError;

    if (existingRequest) {
      throw new Error("A dealer application already exists for this phone number.");
    }

    return existingProfile;
  };

  const getMissingSchemaColumn = (error: any) => {
    const message = String(error?.message || error?.details || "");
    const match = message.match(/Could not find the '([^']+)' column/i);
    return match?.[1] || null;
  };

  const insertWithSchemaFallback = async (tableName: string, payload: Record<string, any>) => {
    const currentPayload = { ...payload };

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error } = await (supabase as any).from(tableName).insert(currentPayload);
      if (!error) return;

      const missingColumn = getMissingSchemaColumn(error);
      if (missingColumn && missingColumn in currentPayload) {
        delete currentPayload[missingColumn];
        continue;
      }

      throw error;
    }

    throw new Error(`Could not save ${tableName}. Please check the database columns.`);
  };

  const upsertProfileWithSchemaFallback = async (payload: Record<string, any>) => {
    const currentPayload = { ...payload };

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error } = await (supabase as any)
        .from("profiles")
        .upsert(currentPayload, { onConflict: "id" });

      if (!error) return;

      const missingColumn = getMissingSchemaColumn(error);
      if (missingColumn && missingColumn in currentPayload) {
        delete currentPayload[missingColumn];
        continue;
      }

      throw error;
    }

    throw new Error("Could not save dealer profile. Please check the database columns.");
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!phoneVerified) return toast.error("Verify phone first");
    if (!emailVerified) return toast.error("Verify email first");
    if (!isValidEmail(form.email)) return toast.error("Enter a valid email");
    if (!passwordsMatch) return toast.error("Passwords must match and be at least 6 characters");
    if (!detailsComplete) return toast.error("Complete all business details");
    if (!docFile) return toast.error("Upload license document");

    setLoading(true);

    try {
      const authEmail = phoneToInternalEmail(form.phone);
      const contactEmail = form.email.trim().toLowerCase();
      const finalPhone = getFirebasePhone(form.phone);
      const normalizedLicense = form.dealer_license_number.replace(/\D/g, "");
      const normalizedPhone = finalPhone.replace(/\D/g, "");

      if (normalizedLicense && normalizedLicense === normalizedPhone) {
        throw new Error("Dealer license number and phone number cannot be the same.");
      }

      const existingProfile = await checkPhoneExists(finalPhone, contactEmail);
      let activeUserId = "";

      if (existingProfile) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: form.password,
        });

        if (signInError) {
          throw new Error("This buyer account already exists. Enter its current password to apply as a dealer.");
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Could not start dealer signup session");
        activeUserId = user.id;
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password: form.password,
          options: {
            data: {
              phone: finalPhone,
              contact_email: contactEmail,
              role: "dealer",
              business_name: form.business_name,
            },
          },
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup failed");

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: form.password,
        });

        if (signInError) throw signInError;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Could not start dealer signup session");
        activeUserId = user.id;
      }

      const path = `${activeUserId}/${Date.now()}-${docFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, docFile);

      if (uploadError) throw uploadError;

      const { data: url } = supabase.storage.from("documents").getPublicUrl(path);

      await insertWithSchemaFallback("dealer_requests", {
        user_id: activeUserId,
        email: contactEmail,
        auth_email: authEmail,
        full_name: form.full_name,
        business_name: form.business_name,
        dealer_license_number: form.dealer_license_number,
        license_number: form.dealer_license_number,
        phone: finalPhone,
        city: form.city,
        province: form.province,
        license_document_url: url.publicUrl,
        documents: url.publicUrl,
        status: "pending",
      });

      await upsertProfileWithSchemaFallback({
        id: (existingProfile as any)?.id || activeUserId,
        user_id: activeUserId,
        email: contactEmail,
        auth_email: authEmail,
        full_name: form.full_name,
        phone: finalPhone,
        role: "dealer",
        dealer_status: "pending",
        dealer_license_number: form.dealer_license_number,
        business_name: form.business_name,
        city: form.city,
        province: form.province,
        profile_completed: true,
      });

      await supabase.auth.signOut();

      toast.success("Application submitted");
      navigate("/dealer-pending");
    } catch (err: any) {
      console.error("SUBMIT ERROR:", err);
      await supabase.auth.signOut();
      toast.error(err.message || "Could not submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center p-4">
      <SEO
        title="Dealer Registration"
        description="Apply for a 1ntel dealer account to list vehicles, manage inventory, receive leads, and use dealership tools in Canada."
        path="/dealer-registration"
      />
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-6">
          <BrandLogo className="text-5xl mb-2" />
          <h1 className="text-sm text-gray-500">Dealer Registration</h1>
        </div>

        <div className="bg-white rounded-2xl border p-6 sm:p-8 shadow-xl">
          <Button
            type="button"
            variant="ghost"
            className="mb-4 px-0 text-gray-600 hover:bg-transparent hover:text-blue-600"
            onClick={() => navigate("/auth?mode=signup")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to signup
          </Button>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-gray-50 p-1 sm:grid-cols-5">
              {steps.map((item, index) => {
                const StepIcon = item.icon;
                const active = step === index;

                return (
                  <div
                    key={item.label}
                    className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-xs font-semibold transition lg:px-2 ${
                      active
                        ? "bg-white text-blue-600 shadow-sm"
                        : item.complete
                        ? "text-green-700"
                        : "text-gray-500"
                    }`}
                  >
                    {item.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                    <span className="whitespace-nowrap">{item.label}</span>
                  </div>
                );
              })}
            </div>

            {step === 0 && (
              <div className="space-y-4 rounded-xl border bg-white/80 p-4">
                <div>
                  <p className="font-semibold text-gray-900">Verify your phone</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter your dealership contact number and confirm the OTP.
                  </p>
                </div>

                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Phone number"
                  inputMode="tel"
                />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={sendPhoneOtp}
                  disabled={sendingPhoneOtp || phoneVerified || otpCooldown > 0}
                >
                  {sendingPhoneOtp
                    ? "Sending OTP..."
                    : otpCooldown > 0
                    ? `Wait ${otpCooldown}s`
                    : phoneVerified
                    ? "Phone Verified"
                    : "Send OTP"}
                </Button>

                {otpCooldown > 0 && !phoneVerified && (
                  <p className="text-xs text-gray-500">
                    To protect your account, please wait before requesting another OTP.
                  </p>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter OTP"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={phoneVerified}
                    inputMode="numeric"
                  />
                  <Button type="button" onClick={verifyPhone} disabled={phoneVerified}>
                    {phoneVerified ? "Verified" : "Verify"}
                  </Button>
                </div>

                <Button type="button" className="w-full" disabled={!phoneVerified} onClick={() => setStep(1)}>
                  Continue
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 rounded-xl border bg-white/80 p-4">
                <div>
                  <p className="font-semibold text-gray-900">Verify your email</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add an email for approvals, billing, and dealer updates.
                  </p>
                </div>

                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Email address"
                  required
                />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={sendEmailOtp}
                  disabled={sendingEmailOtp || emailVerified || emailOtpCooldown > 0}
                >
                  {sendingEmailOtp
                    ? "Sending Email OTP..."
                    : emailOtpCooldown > 0
                    ? `Wait ${emailOtpCooldown}s`
                    : emailVerified
                    ? "Email Verified"
                    : "Send Email OTP"}
                </Button>

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email OTP"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={emailVerified}
                    inputMode="numeric"
                  />
                  <Button type="button" onClick={verifyEmail} disabled={emailVerified}>
                    {emailVerified ? "Verified" : "Verify"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button type="button" disabled={!emailVerified} onClick={() => setStep(2)}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 rounded-xl border bg-white/80 p-4">
                <div>
                  <p className="font-semibold text-gray-900">Create your password</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Use at least 6 characters and confirm it below.
                  </p>
                </div>

                <div>
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Confirm Password</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    required
                    className={form.confirmPassword && passwordsMatch ? "border-green-500 focus-visible:ring-green-500" : ""}
                  />

                  {form.confirmPassword && (
                    <p className={`mt-1 text-xs ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="button" disabled={!passwordsMatch} onClick={() => setStep(3)}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 rounded-xl border bg-white/80 p-4">
                <div>
                  <p className="font-semibold text-gray-900">Business details</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Tell us who is applying and which dealership this belongs to.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="Full Name"
                    value={form.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                  />
                  <Input
                    placeholder="Business Name"
                    value={form.business_name}
                    onChange={(e) => handleChange("business_name", e.target.value)}
                  />
                </div>

                <Input
                  placeholder="License Number"
                  value={form.dealer_license_number}
                  onChange={(e) => handleChange("dealer_license_number", e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />

                  <select
                    value={form.province}
                    onChange={(e) => handleChange("province", e.target.value)}
                    className="h-10 border rounded-md px-3"
                  >
                    <option value="">Province</option>
                    {provinces.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="button" disabled={!detailsComplete} onClick={() => setStep(4)}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 rounded-xl border bg-white/80 p-4">
                <div>
                  <p className="font-semibold text-gray-900">Upload license document</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add your dealer license document for admin review.
                  </p>
                </div>

                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed rounded-xl p-5 text-center hover:border-blue-500">
                    {docPreview === "pdf" ? (
                      <FileText className="mx-auto h-10 w-10 text-blue-500" />
                    ) : docPreview ? (
                      <img src={docPreview} className="max-h-28 mx-auto" />
                    ) : (
                      <>
                        <Upload className="mx-auto h-6 w-6" />
                        <p className="text-sm mt-2">Click to upload</p>
                      </>
                    )}

                    {docName && <p className="text-xs mt-2 text-gray-600">{docName}</p>}
                  </div>

                  <input type="file" className="hidden" onChange={handleFile} />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button
                    className={canSubmit ? "bg-green-600 hover:bg-green-700" : ""}
                    disabled={!canSubmit}
                  >
                    {loading ? (
                      <GlobalLoader className="w-auto py-0" sizeClassName="h-8 w-8" />
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}
