import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isLogin = searchParams.get("mode") !== "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
  const [loading, setLoading] = useState(false);

  /* ================= AUTO REDIRECT ================= */
  useEffect(() => {
    const checkUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session?.user) return;

      const user = sessionData.session.user;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      if (profile.role === "dealer") {
        navigate("/dealer-dashboard");
      } else {
        navigate("/dashboard");
      }
    };

    checkUser();
  }, [navigate]);

  /* ================= HANDLE SUBMIT ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    /* ================= LOGIN ================= */
    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      const user = data.user;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role || "buyer";

      if (userRole === "dealer") {
        navigate("/dealer-dashboard");
      } else {
        navigate("/dashboard");
      }

      setLoading(false);
      return;
    }

    /* ================= SIGNUP ================= */

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      alert("Signup failed");
      setLoading(false);
      return;
    }

    /* ✅ UPSERT PROFILE (SAFE) */
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: data.user.id,
        email: data.user.email,
        role: role,
        plan: "free"
      });

    if (profileError) {
      console.error(profileError);
      alert("Profile error: " + profileError.message);
      setLoading(false);
      return;
    }

    /* ✅ LOGIN AFTER SIGNUP */
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      alert(loginError.message);
      setLoading(false);
      return;
    }

    /* ✅ REDIRECT */
    if (role === "dealer") {
      navigate("/dealer-dashboard");
    } else {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container flex justify-center py-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-md"
        >
          <div className="glass p-8 rounded-xl shadow-lg">

            <h1 className="text-2xl font-bold text-center mb-6">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">

              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
              />

              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                required
              />

              {/* ROLE SELECT */}
              {!isLogin && (
                <Select onValueChange={setRole} defaultValue="buyer">
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Signup as Buyer</SelectItem>
                    <SelectItem value="dealer">Signup as Dealer</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
              </Button>

            </form>

            <p className="text-center mt-4 text-sm">
              {isLogin ? (
                <Link to="/auth?mode=signup">Create account</Link>
              ) : (
                <Link to="/auth?mode=login">Already have an account?</Link>
              )}
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;