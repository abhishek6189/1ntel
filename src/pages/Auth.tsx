import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isLogin = searchParams.get("mode") !== "signup";
  const isDealer = searchParams.get("type") === "dealer";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= GOOGLE LOGIN ================= */
  const handleGoogleLogin = async () => {

    // ❌ BLOCK DEALER GOOGLE LOGIN
    if (isDealer) {
      alert("Dealer accounts cannot sign in with Google here. Please use Dealer Login.");
      return;
    }

    localStorage.setItem("login_role", "buyer");

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth",
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });
  };

  /* ================= AUTO REDIRECT ================= */
  useEffect(() => {
    const checkUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const savedRole = localStorage.getItem("login_role");
      const role = savedRole === "dealer" ? "dealer" : "buyer";

      /* ================= FIRST TIME USER ================= */
      if (!profile) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "",
            avatar_url:
              user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              "",
            role,
            plan: role === "dealer" ? "dealer" : "free",
            dealer_status: role === "dealer" ? "none" : null
          });

        if (insertError) {
          console.error("Profile insert error:", insertError);
        }

        localStorage.removeItem("login_role");

        if (role === "dealer") {
          navigate("/dealer-profile-setup");
        } else {
          navigate("/profile-setup");
        }

        return;
      }

      /* ================= EXISTING USER FLOW ================= */

      if (profile.role === "admin") {
        navigate("/admin");
        return;
      }

      // ❌ BLOCK DEALER AUTO LOGIN FROM HERE
      if (profile.role === "dealer") {
        navigate("/dealer-auth"); // force dealer login page
        return;
      }

      navigate("/dashboard");
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
        .select("*")
        .eq("id", user.id)
        .single();

      /* ================= ADMIN ================= */
      if (profile.role === "admin") {
        navigate("/admin");
        return;
      }

      /* ❌ BLOCK DEALER LOGIN HERE */
      if (profile.role === "dealer") {
        alert("Dealer accounts cannot log in here. Please use Dealer Login.");
        await supabase.auth.signOut(); // logout immediately
        setLoading(false);
        return;
      }

      /* ================= USER ================= */
      navigate("/dashboard");

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

    const role = isDealer ? "dealer" : "buyer";

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: data.user.id,
          email: data.user.email,
          role: role,
          plan: role === "dealer" ? "dealer" : "free",
          dealer_status: role === "dealer" ? "none" : null
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error(profileError);
      alert("Profile error: " + profileError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (role === "dealer") {
      navigate("/dealer-profile-setup");
    } else {
      navigate("/profile-setup");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container flex justify-center py-20 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-md"
        >
          <div className="glass p-6 sm:p-8 rounded-xl shadow-lg">

            <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
              {isLogin
                ? "Welcome Back"
                : "Create Account"}
            </h1>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 mb-4"
              onClick={handleGoogleLogin}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5 h-5"
              />
              Continue with Google
            </Button>

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

              <Button className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
              </Button>

            </form>

            {/* 🔥 LINKS */}
            <p className="text-center mt-4 text-sm space-y-2">

              <Link to="/dealer-auth" className="text-blue-600 font-semibold">
                Dealer Login →
              </Link>

              <div className="mt-2">
                <Link
                  to="/dealer-registration"
                  className="text-gray-500"
                >
                  Want to signup as Dealer?
                </Link>
              </div>

            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;