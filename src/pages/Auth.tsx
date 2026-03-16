import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isLogin = searchParams.get("mode") !== "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          alert(error.message);
          setLoading(false);
          return;
        }

        alert("Login successful!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });

        if (error) {
          alert(error.message);
          setLoading(false);
          return;
        }

        alert("Account created successfully. Please login.");
        navigate("/auth?mode=login");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container flex items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-2xl p-8">

            <div className="text-center mb-8">
              <Shield className="h-10 w-10 text-primary mx-auto mb-3" />

              <h1 className="font-heading text-2xl font-bold">
                {isLogin ? "Welcome Back" : "Create Your Account"}
              </h1>

              <p className="text-sm text-muted-foreground mt-1">
                {isLogin
                  ? "Log in to your VerifyCar account"
                  : "Join Canada's verified car marketplace"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isLogin
                  ? "Log In"
                  : "Create Account"}
              </Button>

            </form>

            <p className="text-sm text-center text-muted-foreground mt-6">
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <Link
                    to="/auth?mode=signup"
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link
                    to="/auth?mode=login"
                    className="text-primary hover:underline"
                  >
                    Log in
                  </Link>
                </>
              )}
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;