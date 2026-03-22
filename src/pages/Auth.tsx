import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { Shield } from "lucide-react";
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

  // ✅ AUTO REDIRECT IF ALREADY LOGGED IN
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        navigate("/dashboard/buyer");
      }
    };
    checkUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

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

      let userRole = "buyer";

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role) userRole = profile.role;

      if (userRole === "admin") navigate("/dashboard/admin");
      else if (userRole === "inspector") navigate("/dashboard/inspector");
      else if (userRole === "dealer") navigate("/dashboard/seller");
      else navigate("/dashboard/buyer");

      return;
    }

    /* SIGNUP */

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await (supabase as any).from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        role
      });
    }

    alert("Account created!");
    navigate("/auth?mode=login");
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container flex justify-center py-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">

          <div className="glass p-8 rounded-xl">

            <h1 className="text-2xl font-bold text-center mb-6">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">

              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />

              {!isLogin && (
                <Select onValueChange={setRole} defaultValue="buyer">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
              </Button>

            </form>

            <p className="text-center mt-4 text-sm">
              {isLogin
                ? <Link to="/auth?mode=signup">Create account</Link>
                : <Link to="/auth?mode=login">Already have account</Link>}
            </p>

          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default Auth;