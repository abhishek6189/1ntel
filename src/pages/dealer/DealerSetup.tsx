import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRef } from "react";

const provinces = ["AB","BC","MB","NB","NL","NS","ON","PE","QC","SK","NT","NU","YT"];

export default function DealerSetup() {
  const navigate = useNavigate();
  const recaptchaRef = useRef<any>(null);
  const confirmationResultRef = useRef<any>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    business_name: "",
    dealer_license_number: "",
    phone: "",
    city: "",
    province: ""
  });

  /* STATES */
  const [docFile, setDocFile] = useState<any>(null);
  const [docName, setDocName] = useState("");
  const [docPreview, setDocPreview] = useState("");

  const [emailOtp, setEmailOtp] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [loading, setLoading] = useState(false);


  const handleChange = (f: string, v: string) =>
    setForm((p) => ({ ...p, [f]: v }));

  /* LOAD USER EMAIL */
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setForm((p) => ({ ...p, email: data.user.email }));
      }
    };
    load();
  }, []);

  /* FILE */
  const handleFile = (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

  setDocFile(file);
  setDocName(file.name);

  if (file.type.startsWith("image/")) {
    setDocPreview(URL.createObjectURL(file));
  } else {
    setDocPreview("pdf");
  }
};

  /* EMAIL OTP */
  const sendEmailOtp = async () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  setEmailCode(code);

  const res = await fetch(
    "https://ppgsdxuyjcncftyngqnr.supabase.co/functions/v1/send-otp",
    {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
  "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY
},
      body: JSON.stringify({
        email: form.email,
        code
      })
    }
  );

  if (res.ok) {
    toast.success("OTP sent successfully 🚀");
  } else {
    toast.error("Failed to send OTP");
  }
};

const verifyEmail = () => {
  if (emailOtp !== emailCode) {
    toast.error("Invalid OTP ❌");
    return;
  }

  setEmailVerified(true);
  toast.success("Email verified ✅");
};

  /* PHONE OTP */

const sendPhoneOtp = async () => {
  if (!form.phone) return toast.error("Enter phone");

  try {
    const cleanPhone = form.phone.replace(/\D/g, "");
    const finalPhone = "+" + cleanPhone;

    console.log("PHONE FINAL:", finalPhone);

    if (!recaptchaRef.current) {
  recaptchaRef.current = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    { size: "invisible" }
  );
}

const verifier = recaptchaRef.current;

    confirmationResultRef.current = await signInWithPhoneNumber(
      auth,
      finalPhone,
      verifier
    );

    toast.success("OTP sent 🚀");

  } catch (err: any) {
    console.error(err);
    toast.error(err.message);
  }
};
      /*verify phone OTP */

const verifyPhone = async () => {
  if (!phoneOtp) return toast.error("Enter OTP");

  try {
    await confirmationResultRef.current.confirm(phoneOtp);

    setPhoneVerified(true);
    toast.success("Phone verified ✅");

  } catch (err) {
    toast.error("Invalid OTP ❌");
  }
};



/* SUBMIT */
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!emailVerified || !phoneVerified)
      return toast.error("Verify email & phone first");

    if (!docFile)
      return toast.error("Upload license document");

    if (!form.password)
      return toast.error("Set password");

    setLoading(true);

    try {
      /* CREATE AUTH USER */
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });

      if (error) throw error;

      const user = data.user;

      /* UPLOAD FILE */
      const path = `${user?.id}-${Date.now()}`;
      await supabase.storage.from("documents").upload(path, docFile);

      const { data: url } = supabase.storage
        .from("documents")
        .getPublicUrl(path);

      /* SAVE DEALER */
      await supabase.from("dealer_requests").insert({
        user_id: user?.id,
        ...form,
        license_document_url: url.publicUrl,
        status: "pending"
      });

      /* PROFILE */
      await supabase.from("profiles").insert({
        id: user?.id,
        email: form.email,
        full_name: form.full_name,
        phone: form.phone,
        role: "dealer",
        dealer_status: "pending"
      });

      toast.success("Application submitted 🚀");
      navigate("/dealer-pending");

    } catch (err: any) {
      toast.error(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center p-4">

      <div className="w-full max-w-xl">

        {/* HEADER */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" className="h-12 mb-2" />
          <h1 className="text-2xl font-bold"></h1>
          <h1 className="text-sm text-gray-500">Dealer Registration</h1>
        </div>

        {/* CARD */}
        <div className="bg-white rounded-2xl border p-6 sm:p-8 shadow-xl">

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* EMAIL */}
            <div>
              <Label>Email</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                <Button type="button" onClick={sendEmailOtp}>
                  OTP
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Input
                  placeholder="Enter OTP"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                />
                <Button type="button" onClick={verifyEmail}>
                  Verify
                </Button>
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Create Password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
            </div>

            {/* PHONE */}
            <div>
              <Label>Phone</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
                <Button type="button" onClick={sendPhoneOtp}>
                  OTP
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Input
                  placeholder="Enter OTP"
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value)}
                />
                <Button type="button" onClick={verifyPhone}>
                  Verify
                </Button>
              </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input placeholder="Full Name"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)} />
              <Input placeholder="Business Name"
                value={form.business_name}
                onChange={(e) => handleChange("business_name", e.target.value)} />
            </div>

            <Input placeholder="License Number"
              value={form.dealer_license_number}
              onChange={(e) =>
                handleChange("dealer_license_number", e.target.value)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input placeholder="City"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)} />

              <select
                value={form.province}
                onChange={(e) => handleChange("province", e.target.value)}
                className="h-10 border rounded-md px-3"
              >
                <option value="">Province</option>
                {provinces.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* FILE */}
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

                {docName && (
                  <p className="text-xs mt-2 text-gray-600">{docName}</p>
                )}
              </div>

              <input type="file" className="hidden" onChange={handleFile} />
            </label>

            <Button className="w-full h-12" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Submit Application"
              )}
            </Button>

          </form>
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}