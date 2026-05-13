import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";

const provinces = ["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "NT", "NU", "YT"];

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
    city: "",
    province: "",
  });

  const [docFile, setDocFile] = useState<any>(null);
  const [docName, setDocName] = useState("");
  const [docPreview, setDocPreview] = useState("");

  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordsMatch =
    form.password.length >= 6 &&
    form.confirmPassword.length >= 6 &&
    form.password === form.confirmPassword;

  const canSubmit = phoneVerified && passwordsMatch && !loading;

  const handleChange = (field: string, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));

    if (field === "phone") {
      setPhoneVerified(false);
      setPhoneOtp("");
      confirmationResultRef.current = null;
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

    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;

    throw new Error("Enter a valid phone number with country code.");
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
    } catch (err: any) {
      console.error("PHONE OTP ERROR:", err);
      resetRecaptcha();
      toast.error(`${err?.code || "Firebase error"}: ${err?.message || "Could not send OTP"}`);
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

  const checkPhoneExists = async (finalPhone: string, email: string) => {
    const possiblePhones = [
      finalPhone,
      finalPhone.replace(/\D/g, ""),
      finalPhone.replace(/^\+1/, ""),
      finalPhone.replace(/^\+91/, ""),
    ];

    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, phone, email, role, dealer_status")
      .or(
        `phone.in.(${possiblePhones.map((phone) => `"${phone}"`).join(",")}),email.eq.${email}`
      )
      .maybeSingle();

    if (profileError) throw profileError;

    if (existingProfile) {
      throw new Error("This phone number is already registered.");
    }

    const { data: existingRequest, error: requestError } = await supabase
      .from("dealer_requests")
      .select("id, phone, email, status")
      .or(
        `phone.in.(${possiblePhones.map((phone) => `"${phone}"`).join(",")}),email.eq.${email}`
      )
      .maybeSingle();

    if (requestError) throw requestError;

    if (existingRequest) {
      throw new Error("A dealer application already exists for this phone number.");
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!phoneVerified) return toast.error("Verify phone first");
    if (!passwordsMatch) return toast.error("Passwords must match and be at least 6 characters");
    if (!docFile) return toast.error("Upload license document");

    setLoading(true);

    try {
      const email = phoneToInternalEmail(form.phone);
      const finalPhone = getFirebasePhone(form.phone);

      await checkPhoneExists(finalPhone, email);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            phone: finalPhone,
            role: "dealer",
            business_name: form.business_name,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Signup failed");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });

      if (signInError) throw signInError;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Could not start dealer signup session");

      const path = `${user.id}/${Date.now()}-${docFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, docFile);

      if (uploadError) throw uploadError;

      const { data: url } = supabase.storage.from("documents").getPublicUrl(path);

      const { error: requestError } = await supabase.from("dealer_requests").insert({
        user_id: user.id,
        email,
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

      if (requestError) throw requestError;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email,
          full_name: form.full_name,
          phone: finalPhone,
          role: "dealer",
          dealer_status: "pending",
          dealer_license_number: form.dealer_license_number,
          business_name: form.business_name,
          city: form.city,
          province: form.province,
          profile_completed: true,
        },
        { onConflict: "id" }
      );

      if (profileError) throw profileError;

      await supabase.auth.signOut();

      toast.success("Application submitted");
      navigate("/dealer-pending");
    } catch (err: any) {
      console.error("SUBMIT ERROR:", err);
      toast.error(err.message || "Could not submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-6">
          <BrandLogo className="text-5xl mb-2" />
          <h1 className="text-sm text-gray-500">Dealer Registration</h1>
        </div>

        <div className="bg-white rounded-2xl border p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Phone</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
                <Button
                  type="button"
                  onClick={sendPhoneOtp}
                  disabled={sendingPhoneOtp || phoneVerified}
                >
                  {sendingPhoneOtp ? "Sending..." : "OTP"}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Input
                  placeholder="Enter OTP"
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={phoneVerified}
                />
                <Button type="button" onClick={verifyPhone} disabled={phoneVerified}>
                  {phoneVerified ? "Verified" : "Verify"}
                </Button>
              </div>
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
                className={
                  form.confirmPassword && passwordsMatch
                    ? "border-green-500 focus-visible:ring-green-500"
                    : ""
                }
              />

              {form.confirmPassword && (
                <p className={`mt-1 text-xs ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
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

            <Button
              className={`w-full h-12 ${
                canSubmit
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 hover:bg-gray-400"
              }`}
              disabled={!canSubmit}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Submit Application"}
            </Button>
          </form>

          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}
